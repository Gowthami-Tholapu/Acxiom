from datetime import date
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, func, or_, desc
from sqlalchemy.orm import Session, joinedload

from app.models.customer import Customer
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.user import User
from app.schemas.opportunity import OpportunityCreate, OpportunityUpdate
from app.services.audit_service import audit_service
from app.utils.filters import apply_scope_filter, verify_record_access
from app.utils.validators import validate_opportunity_rules


class OpportunityService:
    @staticmethod
    def list_opportunities(
        db: Session,
        current_user: User,
        *,
        search: Optional[str] = None,
        stage: Optional[str] = None,
        status_filter: Optional[str] = None,
        customer_id: Optional[int] = None,
        assigned_to: Optional[int] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Opportunity], int]:
        stmt = select(Opportunity).options(
            joinedload(Opportunity.customer),
            joinedload(Opportunity.assigned_user),
            joinedload(Opportunity.lead),
        )
        stmt = apply_scope_filter(stmt, Opportunity, current_user, owner_column_name="assigned_to")

        count_stmt = select(func.count(Opportunity.id))
        count_stmt = apply_scope_filter(count_stmt, Opportunity, current_user, owner_column_name="assigned_to")

        if search:
            pattern = f"%{search.strip()}%"
            filter_cond = or_(
                Opportunity.opportunity_name.ilike(pattern),
                Opportunity.customer.has(Customer.customer_name.ilike(pattern)),
            )
            stmt = stmt.where(filter_cond)
            count_stmt = count_stmt.where(filter_cond)

        if stage:
            stmt = stmt.where(Opportunity.stage == stage)
            count_stmt = count_stmt.where(Opportunity.stage == stage)

        if status_filter:
            stmt = stmt.where(Opportunity.status == status_filter)
            count_stmt = count_stmt.where(Opportunity.status == status_filter)

        if customer_id:
            stmt = stmt.where(Opportunity.customer_id == customer_id)
            count_stmt = count_stmt.where(Opportunity.customer_id == customer_id)

        if assigned_to and current_user.role.name in ["Admin", "Manager"]:
            stmt = stmt.where(Opportunity.assigned_to == assigned_to)
            count_stmt = count_stmt.where(Opportunity.assigned_to == assigned_to)

        total = db.scalar(count_stmt) or 0
        items = db.scalars(
            stmt.order_by(desc(Opportunity.created_at)).offset(skip).limit(limit)
        ).all()
        return items, total

    @staticmethod
    def get_by_id(db: Session, opp_id: int, current_user: User) -> Opportunity:
        opp = db.scalar(
            select(Opportunity)
            .options(
                joinedload(Opportunity.customer),
                joinedload(Opportunity.assigned_user),
                joinedload(Opportunity.lead),
            )
            .where(Opportunity.id == opp_id)
        )
        if not opp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")

        verify_record_access(opp, current_user, owner_column_name="assigned_to")
        return opp

    @staticmethod
    def create_opportunity(
        db: Session,
        data: OpportunityCreate,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> Opportunity:
        # Validate business rules
        is_valid, err_msg = validate_opportunity_rules(
            amount=data.amount,
            probability=data.probability,
            expected_close_date=data.expected_close_date,
            stage=data.stage,
        )
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

        # Check customer exists
        customer = db.scalar(select(Customer).where(Customer.id == data.customer_id))
        if not customer:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected Customer does not exist.")

        # Check lead if supplied
        if data.lead_id:
            lead = db.scalar(select(Lead).where(Lead.id == data.lead_id))
            if not lead:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected Lead does not exist.")

        assigned_id = data.assigned_to
        if not assigned_id or current_user.role.name == "SalesExecutive":
            assigned_id = current_user.id
        else:
            assignee = db.scalar(select(User).where(User.id == assigned_id))
            if not assignee:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user not found.")

        opp_status = "Open"
        if data.stage == "Won":
            opp_status = "Won"
        elif data.stage == "Lost":
            opp_status = "Lost"

        opp = Opportunity(
            opportunity_name=data.opportunity_name.strip(),
            customer_id=data.customer_id,
            lead_id=data.lead_id,
            amount=data.amount,
            stage=data.stage,
            probability=data.probability,
            expected_close_date=data.expected_close_date,
            status=opp_status,
            assigned_to=assigned_id,
            notes=data.notes.strip() if data.notes else None,
        )
        db.add(opp)
        db.commit()
        db.refresh(opp)

        audit_service.log_event(
            db,
            action="CREATE",
            entity_name="Opportunity",
            record_id=opp.id,
            user_id=current_user.id,
            new_value={
                "name": opp.opportunity_name,
                "amount": opp.amount,
                "stage": opp.stage,
                "status": opp.status,
                "assigned_to": opp.assigned_to,
            },
            details=f"Opportunity {opp.opportunity_name} created with amount ${opp.amount}",
            ip_address=ip_address,
        )
        db.commit()
        return opp

    @staticmethod
    def update_opportunity(
        db: Session,
        opp_id: int,
        data: OpportunityUpdate,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> Opportunity:
        opp = OpportunityService.get_by_id(db, opp_id, current_user)
        old_val = {
            "name": opp.opportunity_name,
            "stage": opp.stage,
            "status": opp.status,
            "amount": opp.amount,
            "probability": opp.probability,
            "expected_close_date": str(opp.expected_close_date),
        }

        # Check fields to validate
        new_amount = data.amount if data.amount is not None else opp.amount
        new_probability = data.probability if data.probability is not None else opp.probability
        new_stage = data.stage if data.stage is not None else opp.stage
        new_close_date = data.expected_close_date if data.expected_close_date is not None else opp.expected_close_date

        is_valid, err_msg = validate_opportunity_rules(
            amount=new_amount,
            probability=new_probability,
            expected_close_date=new_close_date,
            stage=new_stage,
        )
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

        if data.customer_id is not None:
            cust = db.scalar(select(Customer).where(Customer.id == data.customer_id))
            if not cust:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Customer not found.")
            opp.customer_id = data.customer_id

        if data.lead_id is not None:
            opp.lead_id = data.lead_id

        if data.opportunity_name is not None:
            opp.opportunity_name = data.opportunity_name.strip()
        opp.amount = new_amount
        opp.stage = new_stage
        opp.probability = new_probability
        opp.expected_close_date = new_close_date

        # Update status according to stage
        if new_stage == "Won":
            opp.status = "Won"
        elif new_stage == "Lost":
            opp.status = "Lost"
        elif data.status is not None:
            opp.status = data.status
        else:
            opp.status = "Open"

        if data.notes is not None:
            opp.notes = data.notes.strip() or None

        if data.assigned_to is not None and current_user.role.name in ["Admin", "Manager"]:
            assignee = db.scalar(select(User).where(User.id == data.assigned_to))
            if not assignee:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user not found.")
            opp.assigned_to = assignee.id

        db.add(opp)
        db.commit()
        db.refresh(opp)

        new_val = {
            "name": opp.opportunity_name,
            "stage": opp.stage,
            "status": opp.status,
            "amount": opp.amount,
            "probability": opp.probability,
            "expected_close_date": str(opp.expected_close_date),
        }
        audit_service.log_event(
            db,
            action="UPDATE",
            entity_name="Opportunity",
            record_id=opp.id,
            user_id=current_user.id,
            old_value=old_val,
            new_value=new_val,
            details=f"Opportunity {opp.opportunity_name} updated to stage {opp.stage}",
            ip_address=ip_address,
        )
        db.commit()
        return opp

    @staticmethod
    def delete_opportunity(
        db: Session,
        opp_id: int,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> None:
        opp = OpportunityService.get_by_id(db, opp_id, current_user)
        old_val = {"name": opp.opportunity_name, "amount": opp.amount, "stage": opp.stage}

        db.delete(opp)
        db.commit()

        audit_service.log_event(
            db,
            action="DELETE",
            entity_name="Opportunity",
            record_id=opp_id,
            user_id=current_user.id,
            old_value=old_val,
            details=f"Opportunity {old_val['name']} deleted",
            ip_address=ip_address,
        )
        db.commit()


opportunity_service = OpportunityService()
