from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_client_ip, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.follow_up import (
    FollowUpCreate,
    FollowUpResponse,
    FollowUpUpdate,
)
from app.services.follow_up_service import follow_up_service
from app.utils.pagination import PaginatedResponse

router = APIRouter(prefix="/followups", tags=["Follow-Ups"])


@router.get("", response_model=PaginatedResponse[FollowUpResponse])
def list_follow_ups(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    follow_up_type: Optional[str] = None,
    assigned_to: Optional[int] = None,
    upcoming: Optional[bool] = None,
    overdue: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    items, total = follow_up_service.list_follow_ups(
        db,
        current_user,
        status_filter=status,
        follow_up_type=follow_up_type,
        assigned_to=assigned_to,
        is_upcoming=upcoming,
        is_overdue=overdue,
        search=search,
        skip=skip,
        limit=page_size,
    )
    result = [
        FollowUpResponse(
            id=f.id,
            customer_id=f.customer_id,
            customer_name=f.customer.customer_name if f.customer else None,
            lead_id=f.lead_id,
            lead_name=f.lead.lead_name if f.lead else None,
            opportunity_id=f.opportunity_id,
            opportunity_name=f.opportunity.opportunity_name if f.opportunity else None,
            follow_up_date=f.follow_up_date,
            follow_up_type=f.follow_up_type,
            subject=f.subject,
            remarks=f.remarks,
            status=f.status,
            assigned_to=f.assigned_to,
            assigned_user_name=f.assigned_user.name if f.assigned_user else None,
            created_at=f.created_at,
            updated_at=f.updated_at,
        )
        for f in items
    ]
    return PaginatedResponse.create(items=result, total=total, page=page, page_size=page_size)


@router.post("", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
def create_follow_up(
    data: FollowUpCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    fu = follow_up_service.create_follow_up(db, data, current_user, ip_address=ip)
    return FollowUpResponse(
        id=fu.id,
        customer_id=fu.customer_id,
        customer_name=fu.customer.customer_name if fu.customer else None,
        lead_id=fu.lead_id,
        lead_name=fu.lead.lead_name if fu.lead else None,
        opportunity_id=fu.opportunity_id,
        opportunity_name=fu.opportunity.opportunity_name if fu.opportunity else None,
        follow_up_date=fu.follow_up_date,
        follow_up_type=fu.follow_up_type,
        subject=fu.subject,
        remarks=fu.remarks,
        status=fu.status,
        assigned_to=fu.assigned_to,
        assigned_user_name=fu.assigned_user.name if fu.assigned_user else current_user.name,
        created_at=fu.created_at,
        updated_at=fu.updated_at,
    )


@router.get("/{follow_up_id}", response_model=FollowUpResponse)
def get_follow_up(
    follow_up_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fu = follow_up_service.get_by_id(db, follow_up_id, current_user)
    return FollowUpResponse(
        id=fu.id,
        customer_id=fu.customer_id,
        customer_name=fu.customer.customer_name if fu.customer else None,
        lead_id=fu.lead_id,
        lead_name=fu.lead.lead_name if fu.lead else None,
        opportunity_id=fu.opportunity_id,
        opportunity_name=fu.opportunity.opportunity_name if fu.opportunity else None,
        follow_up_date=fu.follow_up_date,
        follow_up_type=fu.follow_up_type,
        subject=fu.subject,
        remarks=fu.remarks,
        status=fu.status,
        assigned_to=fu.assigned_to,
        assigned_user_name=fu.assigned_user.name if fu.assigned_user else None,
        created_at=fu.created_at,
        updated_at=fu.updated_at,
    )


@router.put("/{follow_up_id}", response_model=FollowUpResponse)
def update_follow_up(
    follow_up_id: int,
    data: FollowUpUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    fu = follow_up_service.update_follow_up(db, follow_up_id, data, current_user, ip_address=ip)
    return FollowUpResponse(
        id=fu.id,
        customer_id=fu.customer_id,
        customer_name=fu.customer.customer_name if fu.customer else None,
        lead_id=fu.lead_id,
        lead_name=fu.lead.lead_name if fu.lead else None,
        opportunity_id=fu.opportunity_id,
        opportunity_name=fu.opportunity.opportunity_name if fu.opportunity else None,
        follow_up_date=fu.follow_up_date,
        follow_up_type=fu.follow_up_type,
        subject=fu.subject,
        remarks=fu.remarks,
        status=fu.status,
        assigned_to=fu.assigned_to,
        assigned_user_name=fu.assigned_user.name if fu.assigned_user else None,
        created_at=fu.created_at,
        updated_at=fu.updated_at,
    )


@router.delete("/{follow_up_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_follow_up(
    follow_up_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    follow_up_service.delete_follow_up(db, follow_up_id, current_user, ip_address=ip)
    return None
