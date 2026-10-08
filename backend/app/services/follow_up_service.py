from datetime import datetime, date
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, func, or_, desc
from sqlalchemy.orm import Session, joinedload

from app.models.customer import Customer
from app.models.follow_up import FollowUp
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.user import User
from app.schemas.follow_up import FollowUpCreate, FollowUpUpdate
from app.services.audit_service import audit_service
from app.utils.filters import apply_scope_filter, verify_record_access
from app.utils.validators import validate_follow_up_date


class FollowUpService:
    @staticmethod
    def list_follow_ups(
        db: Session,
        current_user: User,
        *,
        status_filter: Optional[str] = None,
        follow_up_type: Optional[str] = None,
        assigned_to: Optional[int] = None,
        is_upcoming: Optional[bool] = None,
        is_overdue: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[FollowUp], int]:
        stmt = select(FollowUp).options(
            joinedload(FollowUp.customer),
            joinedload(FollowUp.lead),
            joinedload(FollowUp.opportunity),
            joinedload(FollowUp.assigned_user),
        )
        stmt = apply_scope_filter(stmt, FollowUp, current_user, owner_column_name="assigned_to")

        count_stmt = select(func.count(FollowUp.id))
        count_stmt = apply_scope_filter(count_stmt, FollowUp, current_user, owner_column_name="assigned_to")

        if search:
            pattern = f"%{search.strip()}%"
            filter_cond = or_(
                FollowUp.subject.ilike(pattern),
                FollowUp.remarks.ilike(pattern),
            )
            stmt = stmt.where(filter_cond)
            count_stmt = count_stmt.where(filter_cond)

        if status_filter:
            stmt = stmt.where(FollowUp.status == status_filter)
            count_stmt = count_stmt.where(FollowUp.status == status_filter)

        if follow_up_type:
            stmt = stmt.where(FollowUp.follow_up_type == follow_up_type)
            count_stmt = count_stmt.where(FollowUp.follow_up_type == follow_up_type)

        now = datetime.now()
        if is_upcoming:
            stmt = stmt.where(FollowUp.follow_up_date >= now, FollowUp.status == "Planned")
            count_stmt = count_stmt.where(FollowUp.follow_up_date >= now, FollowUp.status == "Planned")

        if is_overdue:
            stmt = stmt.where(FollowUp.follow_up_date < now, FollowUp.status == "Planned")
            count_stmt = count_stmt.where(FollowUp.follow_up_date < now, FollowUp.status == "Planned")

        if assigned_to and current_user.role.name in ["Admin", "Manager"]:
            stmt = stmt.where(FollowUp.assigned_to == assigned_to)
            count_stmt = count_stmt.where(FollowUp.assigned_to == assigned_to)

        total = db.scalar(count_stmt) or 0
        items = db.scalars(
            stmt.order_by(FollowUp.follow_up_date.asc()).offset(skip).limit(limit)
        ).all()
        return items, total

    @staticmethod
    def get_by_id(db: Session, follow_up_id: int, current_user: User) -> FollowUp:
        fu = db.scalar(
            select(FollowUp)
            .options(
                joinedload(FollowUp.customer),
                joinedload(FollowUp.lead),
                joinedload(FollowUp.opportunity),
                joinedload(FollowUp.assigned_user),
            )
            .where(FollowUp.id == follow_up_id)
        )
        if not fu:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up not found.")

        verify_record_access(fu, current_user, owner_column_name="assigned_to")
        return fu

    @staticmethod
    def create_follow_up(
        db: Session,
        data: FollowUpCreate,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> FollowUp:
        # Validate follow up date cannot be earlier than today for planned
        if data.status == "Planned":
            is_valid, err_msg = validate_follow_up_date(data.follow_up_date)
            if not is_valid:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

        if data.customer_id:
            cust = db.scalar(select(Customer).where(Customer.id == data.customer_id))
            if not cust:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Referenced Customer does not exist.")

        if data.lead_id:
            lead = db.scalar(select(Lead).where(Lead.id == data.lead_id))
            if not lead:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Referenced Lead does not exist.")

        if data.opportunity_id:
            opp = db.scalar(select(Opportunity).where(Opportunity.id == data.opportunity_id))
            if not opp:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Referenced Opportunity does not exist.")

        assigned_id = data.assigned_to
        if not assigned_id or current_user.role.name == "SalesExecutive":
            assigned_id = current_user.id
        else:
            assignee = db.scalar(select(User).where(User.id == assigned_id))
            if not assignee:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user not found.")

        fu = FollowUp(
            customer_id=data.customer_id,
            lead_id=data.lead_id,
            opportunity_id=data.opportunity_id,
            follow_up_date=data.follow_up_date,
            follow_up_type=data.follow_up_type,
            subject=data.subject.strip(),
            remarks=data.remarks.strip() if data.remarks else None,
            status=data.status,
            assigned_to=assigned_id,
        )
        db.add(fu)
        db.commit()
        db.refresh(fu)

        audit_service.log_event(
            db,
            action="CREATE",
            entity_name="FollowUp",
            record_id=fu.id,
            user_id=current_user.id,
            new_value={
                "subject": fu.subject,
                "type": fu.follow_up_type,
                "date": fu.follow_up_date.isoformat(),
                "status": fu.status,
                "assigned_to": fu.assigned_to,
            },
            details=f"Follow-up '{fu.subject}' scheduled for {fu.follow_up_date.strftime('%Y-%m-%d %H:%M')}",
            ip_address=ip_address,
        )
        db.commit()
        return fu

    @staticmethod
    def update_follow_up(
        db: Session,
        follow_up_id: int,
        data: FollowUpUpdate,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> FollowUp:
        fu = FollowUpService.get_by_id(db, follow_up_id, current_user)
        old_val = {
            "subject": fu.subject,
            "status": fu.status,
            "date": fu.follow_up_date.isoformat(),
            "remarks": fu.remarks,
        }

        # Date validation if rescheduling to Planned
        new_status = data.status if data.status is not None else fu.status
        new_date = data.follow_up_date if data.follow_up_date is not None else fu.follow_up_date

        if new_status == "Planned" and data.follow_up_date is not None:
            is_valid, err_msg = validate_follow_up_date(new_date)
            if not is_valid:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

        if data.subject is not None:
            fu.subject = data.subject.strip()
        if data.follow_up_type is not None:
            fu.follow_up_type = data.follow_up_type
        if data.follow_up_date is not None:
            fu.follow_up_date = data.follow_up_date
        if data.status is not None:
            fu.status = data.status
        if data.remarks is not None:
            fu.remarks = data.remarks.strip() or None
        if data.customer_id is not None:
            fu.customer_id = data.customer_id
        if data.lead_id is not None:
            fu.lead_id = data.lead_id
        if data.opportunity_id is not None:
            fu.opportunity_id = data.opportunity_id

        if data.assigned_to is not None and current_user.role.name in ["Admin", "Manager"]:
            assignee = db.scalar(select(User).where(User.id == data.assigned_to))
            if not assignee:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user not found.")
            fu.assigned_to = assignee.id

        db.add(fu)
        db.commit()
        db.refresh(fu)

        new_val = {
            "subject": fu.subject,
            "status": fu.status,
            "date": fu.follow_up_date.isoformat(),
            "remarks": fu.remarks,
        }
        action_name = "UPDATE"
        if old_val["date"] != new_val["date"]:
            action_name = "RESCHEDULE"
        elif new_val["status"] == "Completed" and old_val["status"] != "Completed":
            action_name = "COMPLETE"

        audit_service.log_event(
            db,
            action=action_name,
            entity_name="FollowUp",
            record_id=fu.id,
            user_id=current_user.id,
            old_value=old_val,
            new_value=new_val,
            details=f"Follow-up '{fu.subject}' updated (Status: {fu.status})",
            ip_address=ip_address,
        )
        db.commit()
        return fu

    @staticmethod
    def delete_follow_up(
        db: Session,
        follow_up_id: int,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> None:
        fu = FollowUpService.get_by_id(db, follow_up_id, current_user)
        old_val = {"subject": fu.subject, "status": fu.status, "date": fu.follow_up_date.isoformat()}

        db.delete(fu)
        db.commit()

        audit_service.log_event(
            db,
            action="DELETE",
            entity_name="FollowUp",
            record_id=follow_up_id,
            user_id=current_user.id,
            old_value=old_val,
            details=f"Follow-up '{old_val['subject']}' deleted",
            ip_address=ip_address,
        )
        db.commit()


follow_up_service = FollowUpService()
