from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_client_ip, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.opportunity import (
    OpportunityCreate,
    OpportunityResponse,
    OpportunityUpdate,
)
from app.services.opportunity_service import opportunity_service
from app.utils.pagination import PaginatedResponse

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])


@router.get("", response_model=PaginatedResponse[OpportunityResponse])
def list_opportunities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    stage: Optional[str] = None,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    opps, total = opportunity_service.list_opportunities(
        db,
        current_user,
        search=search,
        stage=stage,
        status_filter=status,
        customer_id=customer_id,
        assigned_to=assigned_to,
        skip=skip,
        limit=page_size,
    )
    items = [
        OpportunityResponse(
            id=o.id,
            opportunity_name=o.opportunity_name,
            customer_id=o.customer_id,
            customer_name=o.customer.customer_name if o.customer else None,
            lead_id=o.lead_id,
            amount=o.amount,
            stage=o.stage,
            probability=o.probability,
            weighted_value=o.weighted_value,
            expected_close_date=o.expected_close_date,
            status=o.status,
            assigned_to=o.assigned_to,
            assigned_user_name=o.assigned_user.name if o.assigned_user else None,
            notes=o.notes,
            created_at=o.created_at,
            updated_at=o.updated_at,
        )
        for o in opps
    ]
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
def create_opportunity(
    data: OpportunityCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    opp = opportunity_service.create_opportunity(db, data, current_user, ip_address=ip)
    return OpportunityResponse(
        id=opp.id,
        opportunity_name=opp.opportunity_name,
        customer_id=opp.customer_id,
        customer_name=opp.customer.customer_name if opp.customer else None,
        lead_id=opp.lead_id,
        amount=opp.amount,
        stage=opp.stage,
        probability=opp.probability,
        weighted_value=opp.weighted_value,
        expected_close_date=opp.expected_close_date,
        status=opp.status,
        assigned_to=opp.assigned_to,
        assigned_user_name=opp.assigned_user.name if opp.assigned_user else current_user.name,
        notes=opp.notes,
        created_at=opp.created_at,
        updated_at=opp.updated_at,
    )


@router.get("/{opp_id}", response_model=OpportunityResponse)
def get_opportunity(
    opp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    opp = opportunity_service.get_by_id(db, opp_id, current_user)
    return OpportunityResponse(
        id=opp.id,
        opportunity_name=opp.opportunity_name,
        customer_id=opp.customer_id,
        customer_name=opp.customer.customer_name if opp.customer else None,
        lead_id=opp.lead_id,
        amount=opp.amount,
        stage=opp.stage,
        probability=opp.probability,
        weighted_value=opp.weighted_value,
        expected_close_date=opp.expected_close_date,
        status=opp.status,
        assigned_to=opp.assigned_to,
        assigned_user_name=opp.assigned_user.name if opp.assigned_user else None,
        notes=opp.notes,
        created_at=opp.created_at,
        updated_at=opp.updated_at,
    )


@router.put("/{opp_id}", response_model=OpportunityResponse)
def update_opportunity(
    opp_id: int,
    data: OpportunityUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    opp = opportunity_service.update_opportunity(db, opp_id, data, current_user, ip_address=ip)
    return OpportunityResponse(
        id=opp.id,
        opportunity_name=opp.opportunity_name,
        customer_id=opp.customer_id,
        customer_name=opp.customer.customer_name if opp.customer else None,
        lead_id=opp.lead_id,
        amount=opp.amount,
        stage=opp.stage,
        probability=opp.probability,
        weighted_value=opp.weighted_value,
        expected_close_date=opp.expected_close_date,
        status=opp.status,
        assigned_to=opp.assigned_to,
        assigned_user_name=opp.assigned_user.name if opp.assigned_user else None,
        notes=opp.notes,
        created_at=opp.created_at,
        updated_at=opp.updated_at,
    )


@router.delete("/{opp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_opportunity(
    opp_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    opportunity_service.delete_opportunity(db, opp_id, current_user, ip_address=ip)
    return None
