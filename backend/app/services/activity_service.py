from datetime import datetime
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, func, or_, desc
from sqlalchemy.orm import Session, joinedload

from app.models.activity import Activity
from app.models.customer import Customer
from app.models.lead import Lead
from app.models.user import User
from app.schemas.activity import ActivityCreate, ActivityUpdate
from app.services.audit_service import audit_service
from app.utils.filters import apply_scope_filter, verify_record_access


class ActivityService:
    @staticmethod
    def list_activities(
        db: Session,
        current_user: User,
        *,
        activity_type: Optional[str] = None,
        status_filter: Optional[str] = None,
        customer_id: Optional[int] = None,
        lead_id: Optional[int] = None,
        assigned_to: Optional[int] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Activity], int]:
        stmt = select(Activity).options(
            joinedload(Activity.customer),
            joinedload(Activity.lead),
            joinedload(Activity.assigned_user),
        )
        stmt = apply_scope_filter(stmt, Activity, current_user, owner_column_name="assigned_to")

        count_stmt = select(func.count(Activity.id))
        count_stmt = apply_scope_filter(count_stmt, Activity, current_user, owner_column_name="assigned_to")

        if search:
            pattern = f"%{search.strip()}%"
            filter_cond = or_(
                Activity.subject.ilike(pattern),
                Activity.description.ilike(pattern),
            )
            stmt = stmt.where(filter_cond)
            count_stmt = count_stmt.where(filter_cond)

        if activity_type:
            stmt = stmt.where(Activity.activity_type == activity_type)
            count_stmt = count_stmt.where(Activity.activity_type == activity_type)

        if status_filter:
            stmt = stmt.where(Activity.status == status_filter)
            count_stmt = count_stmt.where(Activity.status == status_filter)

        if customer_id:
            stmt = stmt.where(Activity.customer_id == customer_id)
            count_stmt = count_stmt.where(Activity.customer_id == customer_id)

        if lead_id:
            stmt = stmt.where(Activity.lead_id == lead_id)
            count_stmt = count_stmt.where(Activity.lead_id == lead_id)

        if assigned_to and current_user.role.name in ["Admin", "Manager"]:
            stmt = stmt.where(Activity.assigned_to == assigned_to)
            count_stmt = count_stmt.where(Activity.assigned_to == assigned_to)

        total = db.scalar(count_stmt) or 0
        items = db.scalars(
            stmt.order_by(desc(Activity.activity_date)).offset(skip).limit(limit)
        ).all()
        return items, total

    @staticmethod
    def get_by_id(db: Session, activity_id: int, current_user: User) -> Activity:
        activity = db.scalar(
            select(Activity)
            .options(
                joinedload(Activity.customer),
                joinedload(Activity.lead),
                joinedload(Activity.assigned_user),
            )
            .where(Activity.id == activity_id)
        )
        if not activity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.")

        verify_record_access(activity, current_user, owner_column_name="assigned_to")
        return activity

    @staticmethod
    def create_activity(
        db: Session,
        data: ActivityCreate,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> Activity:
        if data.customer_id:
            cust = db.scalar(select(Customer).where(Customer.id == data.customer_id))
            if not cust:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Referenced Customer does not exist.")

        if data.lead_id:
            lead = db.scalar(select(Lead).where(Lead.id == data.lead_id))
            if not lead:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Referenced Lead does not exist.")

        assigned_id = data.assigned_to
        if not assigned_id or current_user.role.name == "SalesExecutive":
            assigned_id = current_user.id
        else:
            assignee = db.scalar(select(User).where(User.id == assigned_id))
            if not assignee:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user not found.")

        activity = Activity(
            activity_type=data.activity_type,
            subject=data.subject.strip(),
            description=data.description.strip() if data.description else None,
            activity_date=data.activity_date,
            customer_id=data.customer_id,
            lead_id=data.lead_id,
            status=data.status,
            assigned_to=assigned_id,
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)

        audit_service.log_event(
            db,
            action="CREATE",
            entity_name="Activity",
            record_id=activity.id,
            user_id=current_user.id,
            new_value={
                "type": activity.activity_type,
                "subject": activity.subject,
                "date": activity.activity_date.isoformat(),
            },
            details=f"Activity '{activity.subject}' ({activity.activity_type}) recorded",
            ip_address=ip_address,
        )
        db.commit()
        return activity

    @staticmethod
    def update_activity(
        db: Session,
        activity_id: int,
        data: ActivityUpdate,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> Activity:
        activity = ActivityService.get_by_id(db, activity_id, current_user)
        old_val = {
            "type": activity.activity_type,
            "subject": activity.subject,
            "status": activity.status,
        }

        if data.activity_type is not None:
            activity.activity_type = data.activity_type
        if data.subject is not None:
            activity.subject = data.subject.strip()
        if data.description is not None:
            activity.description = data.description.strip() or None
        if data.activity_date is not None:
            activity.activity_date = data.activity_date
        if data.customer_id is not None:
            activity.customer_id = data.customer_id
        if data.lead_id is not None:
            activity.lead_id = data.lead_id
        if data.status is not None:
            activity.status = data.status

        if data.assigned_to is not None and current_user.role.name in ["Admin", "Manager"]:
            assignee = db.scalar(select(User).where(User.id == data.assigned_to))
            if not assignee:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user not found.")
            activity.assigned_to = assignee.id

        db.add(activity)
        db.commit()
        db.refresh(activity)

        new_val = {
            "type": activity.activity_type,
            "subject": activity.subject,
            "status": activity.status,
        }
        audit_service.log_event(
            db,
            action="UPDATE",
            entity_name="Activity",
            record_id=activity.id,
            user_id=current_user.id,
            old_value=old_val,
            new_value=new_val,
            details=f"Activity '{activity.subject}' updated",
            ip_address=ip_address,
        )
        db.commit()
        return activity

    @staticmethod
    def delete_activity(
        db: Session,
        activity_id: int,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> None:
        activity = ActivityService.get_by_id(db, activity_id, current_user)
        old_val = {"subject": activity.subject, "type": activity.activity_type}

        db.delete(activity)
        db.commit()

        audit_service.log_event(
            db,
            action="DELETE",
            entity_name="Activity",
            record_id=activity_id,
            user_id=current_user.id,
            old_value=old_val,
            details=f"Activity '{old_val['subject']}' deleted",
            ip_address=ip_address,
        )
        db.commit()


activity_service = ActivityService()
