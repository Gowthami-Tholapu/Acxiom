from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_client_ip, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.activity import (
    ActivityCreate,
    ActivityResponse,
    ActivityUpdate,
)
from app.services.activity_service import activity_service
from app.utils.pagination import PaginatedResponse

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.get("", response_model=PaginatedResponse[ActivityResponse])
def list_activities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    activity_type: Optional[str] = None,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    items, total = activity_service.list_activities(
        db,
        current_user,
        activity_type=activity_type,
        status_filter=status,
        customer_id=customer_id,
        lead_id=lead_id,
        assigned_to=assigned_to,
        search=search,
        skip=skip,
        limit=page_size,
    )
    res = [
        ActivityResponse(
            id=a.id,
            activity_type=a.activity_type,
            subject=a.subject,
            description=a.description,
            activity_date=a.activity_date,
            customer_id=a.customer_id,
            customer_name=a.customer.customer_name if a.customer else None,
            lead_id=a.lead_id,
            lead_name=a.lead.lead_name if a.lead else None,
            assigned_to=a.assigned_to,
            assigned_user_name=a.assigned_user.name if a.assigned_user else None,
            status=a.status,
            created_at=a.created_at,
            updated_at=a.updated_at,
        )
        for a in items
    ]
    return PaginatedResponse.create(items=res, total=total, page=page, page_size=page_size)


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(
    data: ActivityCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    act = activity_service.create_activity(db, data, current_user, ip_address=ip)
    return ActivityResponse(
        id=act.id,
        activity_type=act.activity_type,
        subject=act.subject,
        description=act.description,
        activity_date=act.activity_date,
        customer_id=act.customer_id,
        customer_name=act.customer.customer_name if act.customer else None,
        lead_id=act.lead_id,
        lead_name=act.lead.lead_name if act.lead else None,
        assigned_to=act.assigned_to,
        assigned_user_name=act.assigned_user.name if act.assigned_user else current_user.name,
        status=act.status,
        created_at=act.created_at,
        updated_at=act.updated_at,
    )


@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(
    activity_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    act = activity_service.get_by_id(db, activity_id, current_user)
    return ActivityResponse(
        id=act.id,
        activity_type=act.activity_type,
        subject=act.subject,
        description=act.description,
        activity_date=act.activity_date,
        customer_id=act.customer_id,
        customer_name=act.customer.customer_name if act.customer else None,
        lead_id=act.lead_id,
        lead_name=act.lead.lead_name if act.lead else None,
        assigned_to=act.assigned_to,
        assigned_user_name=act.assigned_user.name if act.assigned_user else None,
        status=act.status,
        created_at=act.created_at,
        updated_at=act.updated_at,
    )


@router.put("/{activity_id}", response_model=ActivityResponse)
def update_activity(
    activity_id: int,
    data: ActivityUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    act = activity_service.update_activity(db, activity_id, data, current_user, ip_address=ip)
    return ActivityResponse(
        id=act.id,
        activity_type=act.activity_type,
        subject=act.subject,
        description=act.description,
        activity_date=act.activity_date,
        customer_id=act.customer_id,
        customer_name=act.customer.customer_name if act.customer else None,
        lead_id=act.lead_id,
        lead_name=act.lead.lead_name if act.lead else None,
        assigned_to=act.assigned_to,
        assigned_user_name=act.assigned_user.name if act.assigned_user else None,
        status=act.status,
        created_at=act.created_at,
        updated_at=act.updated_at,
    )


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    activity_service.delete_activity(db, activity_id, current_user, ip_address=ip)
    return None
