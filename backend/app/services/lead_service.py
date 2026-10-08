from datetime import date, timedelta
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, func, or_, desc
from sqlalchemy.orm import Session, joinedload

from app.models.customer import Customer
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.user import User
from app.schemas.lead import LeadConvertRequest, LeadCreate, LeadUpdate
from app.services.audit_service import audit_service
from app.services.customer_service import customer_service
from app.utils.filters import apply_scope_filter, verify_record_access
from app.utils.validators import (
    validate_email_format,
    validate_opportunity_rules,
    validate_phone_format,
)

VALID_STATUS_TRANSITIONS = {
    "New": ["Contacted", "Unqualified", "Lost"],
    "Contacted": ["Qualified", "Unqualified", "Lost"],
    "Qualified": ["Converted", "Lost", "Contacted"],
    "Unqualified": ["New", "Contacted", "Qualified"],
    "Lost": ["New", "Contacted", "Qualified"],
    "Converted": [],  # Terminal state
}


class LeadService:
    @staticmethod
    def _generate_lead_code(db: Session) -> str:
        count = db.scalar(select(func.count(Lead.id))) or 0
        return f"LEAD-{(count + 1):04d}"

    @staticmethod
    def list_leads(
        db: Session,
        current_user: User,
        *,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_to: Optional[int] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Lead], int]:
        stmt = select(Lead).options(joinedload(Lead.assigned_user))
        stmt = apply_scope_filter(stmt, Lead, current_user, owner_column_name="assigned_to")

        count_stmt = select(func.count(Lead.id))
        count_stmt = apply_scope_filter(count_stmt, Lead, current_user, owner_column_name="assigned_to")

        if search:
            pattern = f"%{search.strip()}%"
            filter_cond = or_(
                Lead.lead_name.ilike(pattern),
                Lead.email.ilike(pattern),
                Lead.phone.ilike(pattern),
                Lead.company_name.ilike(pattern),
                Lead.lead_code.ilike(pattern),
            )
            stmt = stmt.where(filter_cond)
            count_stmt = count_stmt.where(filter_cond)

        if status_filter:
            stmt = stmt.where(Lead.status == status_filter)
            count_stmt = count_stmt.where(Lead.status == status_filter)

        if priority:
            stmt = stmt.where(Lead.priority == priority)
            count_stmt = count_stmt.where(Lead.priority == priority)

        if assigned_to and current_user.role.name in ["Admin", "Manager"]:
            stmt = stmt.where(Lead.assigned_to == assigned_to)
            count_stmt = count_stmt.where(Lead.assigned_to == assigned_to)

        total = db.scalar(count_stmt) or 0
        items = db.scalars(
            stmt.order_by(desc(Lead.created_at)).offset(skip).limit(limit)
        ).all()
        return items, total

    @staticmethod
    def get_by_id(db: Session, lead_id: int, current_user: User) -> Lead:
        lead = db.scalar(
            select(Lead).options(joinedload(Lead.assigned_user)).where(Lead.id == lead_id)
        )
        if not lead:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

        verify_record_access(lead, current_user, owner_column_name="assigned_to")
        return lead

    @staticmethod
    def create_lead(
        db: Session,
        data: LeadCreate,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> Lead:
        if not validate_email_format(data.email):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email address.")

        if not validate_phone_format(data.phone):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid phone number.")

        assigned_id = data.assigned_to
        if not assigned_id or current_user.role.name == "SalesExecutive":
            assigned_id = current_user.id
        else:
            # Check user exists
            assignee = db.scalar(select(User).where(User.id == assigned_id))
            if not assignee:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user does not exist.")

        code = LeadService._generate_lead_code(db)
        lead = Lead(
            lead_code=code,
            lead_name=data.lead_name.strip(),
            email=data.email.strip().lower(),
            phone=data.phone.strip(),
            company_name=data.company_name.strip() if data.company_name else None,
            source=data.source,
            status=data.status,
            priority=data.priority,
            expected_value=data.expected_value,
            assigned_to=assigned_id,
            notes=data.notes.strip() if data.notes else None,
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        audit_service.log_event(
            db,
            action="CREATE",
            entity_name="Lead",
            record_id=lead.id,
            user_id=current_user.id,
            new_value={
                "code": lead.lead_code,
                "name": lead.lead_name,
                "email": lead.email,
                "status": lead.status,
                "assigned_to": lead.assigned_to,
            },
            details=f"Lead {lead.lead_name} ({lead.lead_code}) created",
            ip_address=ip_address,
        )
        db.commit()
        return lead

    @staticmethod
    def update_lead(
        db: Session,
        lead_id: int,
        data: LeadUpdate,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> Lead:
        lead = LeadService.get_by_id(db, lead_id, current_user)

        if lead.status == "Converted" and data.status is not None and data.status != "Converted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A converted lead cannot have its status altered."
            )

        old_val = {
            "name": lead.lead_name,
            "status": lead.status,
            "priority": lead.priority,
            "assigned_to": lead.assigned_to,
            "expected_value": lead.expected_value,
        }

        if data.status and data.status != lead.status:
            allowed = VALID_STATUS_TRANSITIONS.get(lead.status, [])
            if data.status not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid transition from '{lead.status}' to '{data.status}'. Allowed: {allowed}"
                )
            lead.status = data.status

        if data.email:
            if not validate_email_format(data.email):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email address.")
            lead.email = data.email.strip().lower()

        if data.phone:
            if not validate_phone_format(data.phone):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid phone number.")
            lead.phone = data.phone.strip()

        if data.lead_name is not None:
            lead.lead_name = data.lead_name.strip()
        if data.company_name is not None:
            lead.company_name = data.company_name.strip() or None
        if data.source is not None:
            lead.source = data.source
        if data.priority is not None:
            lead.priority = data.priority
        if data.expected_value is not None:
            lead.expected_value = data.expected_value
        if data.notes is not None:
            lead.notes = data.notes.strip() or None

        if data.assigned_to is not None and current_user.role.name in ["Admin", "Manager"]:
            assignee = db.scalar(select(User).where(User.id == data.assigned_to))
            if not assignee:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user not found.")
            lead.assigned_to = assignee.id

        db.add(lead)
        db.commit()
        db.refresh(lead)

        new_val = {
            "name": lead.lead_name,
            "status": lead.status,
            "priority": lead.priority,
            "assigned_to": lead.assigned_to,
            "expected_value": lead.expected_value,
        }
        audit_service.log_event(
            db,
            action="UPDATE",
            entity_name="Lead",
            record_id=lead.id,
            user_id=current_user.id,
            old_value=old_val,
            new_value=new_val,
            details=f"Lead {lead.lead_name} updated",
            ip_address=ip_address,
        )
        db.commit()
        return lead

    @staticmethod
    def convert_lead(
        db: Session,
        lead_id: int,
        data: LeadConvertRequest,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> Tuple[Customer, Optional[Opportunity]]:
        lead = LeadService.get_by_id(db, lead_id, current_user)

        if lead.status == "Converted" or lead.converted_customer_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lead has already been converted."
            )

        # Check if customer already exists with this email or phone
        existing_cust = db.scalar(
            select(Customer).where(
                or_(Customer.email == lead.email, Customer.phone == lead.phone)
            )
        )

        target_company = data.company_name or lead.company_name

        if existing_cust:
            customer = existing_cust
        else:
            # Create customer
            code = customer_service._generate_customer_code(db)
            customer = Customer(
                customer_code=code,
                customer_name=lead.lead_name,
                email=lead.email,
                phone=lead.phone,
                company_name=target_company,
                status="Active",
                created_by=lead.assigned_to,
            )
            db.add(customer)
            db.flush()

            audit_service.log_event(
                db,
                action="CREATE",
                entity_name="Customer",
                record_id=customer.id,
                user_id=current_user.id,
                new_value={"code": customer.customer_code, "name": customer.customer_name},
                details=f"Customer created automatically from conversion of lead {lead.lead_code}",
                ip_address=ip_address,
            )

        opportunity = None
        if data.create_opportunity:
            opp_amount = data.opportunity_amount if data.opportunity_amount is not None else lead.expected_value
            opp_name = data.opportunity_name or f"Deal with {customer.customer_name}"
            opp_close = data.expected_close_date or (date.today() + timedelta(days=30))

            is_valid_opp, opp_err = validate_opportunity_rules(
                amount=opp_amount,
                probability=20.0,
                expected_close_date=opp_close,
                stage="Qualification",
            )
            if not is_valid_opp:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=opp_err)

            opportunity = Opportunity(
                opportunity_name=opp_name,
                customer_id=customer.id,
                lead_id=lead.id,
                amount=opp_amount,
                stage="Qualification",
                probability=20.0,
                expected_close_date=opp_close,
                status="Open",
                assigned_to=lead.assigned_to,
            )
            db.add(opportunity)
            db.flush()

            audit_service.log_event(
                db,
                action="CREATE",
                entity_name="Opportunity",
                record_id=opportunity.id,
                user_id=current_user.id,
                new_value={"name": opportunity.opportunity_name, "amount": opportunity.amount},
                details=f"Opportunity created from lead conversion {lead.lead_code}",
                ip_address=ip_address,
            )

        # Mark lead as converted
        lead.status = "Converted"
        lead.converted_customer_id = customer.id
        db.add(lead)

        audit_service.log_event(
            db,
            action="CONVERT",
            entity_name="Lead",
            record_id=lead.id,
            user_id=current_user.id,
            new_value={
                "converted_customer_id": customer.id,
                "opportunity_id": opportunity.id if opportunity else None,
            },
            details=f"Lead {lead.lead_code} converted to Customer {customer.customer_code}",
            ip_address=ip_address,
        )

        db.commit()
        db.refresh(customer)
        if opportunity:
            db.refresh(opportunity)

        return customer, opportunity

    @staticmethod
    def delete_lead(
        db: Session,
        lead_id: int,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> None:
        lead = LeadService.get_by_id(db, lead_id, current_user)
        old_val = {"code": lead.lead_code, "name": lead.lead_name, "status": lead.status}

        db.delete(lead)
        db.commit()

        audit_service.log_event(
            db,
            action="DELETE",
            entity_name="Lead",
            record_id=lead_id,
            user_id=current_user.id,
            old_value=old_val,
            details=f"Lead {old_val['name']} deleted",
            ip_address=ip_address,
        )
        db.commit()


lead_service = LeadService()
