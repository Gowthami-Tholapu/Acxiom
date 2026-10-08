from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_client_ip, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.customer import CustomerResponse
from app.schemas.lead import (
    LeadConvertRequest,
    LeadCreate,
    LeadResponse,
    LeadUpdate,
)
from app.schemas.opportunity import OpportunityResponse
from app.services.lead_service import lead_service
from app.utils.pagination import PaginatedResponse

router = APIRouter(prefix="/leads", tags=["Leads"])


class LeadConvertResponse(BaseModel):
    customer: CustomerResponse
    opportunity: Optional[OpportunityResponse] = None
    message: str


@router.get("", response_model=PaginatedResponse[LeadResponse])
def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    leads, total = lead_service.list_leads(
        db,
        current_user,
        search=search,
        status_filter=status,
        priority=priority,
        assigned_to=assigned_to,
        skip=skip,
        limit=page_size,
    )
    items = [
        LeadResponse(
            id=l.id,
            lead_code=l.lead_code,
            lead_name=l.lead_name,
            email=l.email,
            phone=l.phone,
            company_name=l.company_name,
            source=l.source,
            status=l.status,
            priority=l.priority,
            expected_value=l.expected_value,
            notes=l.notes,
            assigned_to=l.assigned_to,
            assigned_user_name=l.assigned_user.name if l.assigned_user else None,
            converted_customer_id=l.converted_customer_id,
            created_at=l.created_at,
            updated_at=l.updated_at,
        )
        for l in leads
    ]
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(
    data: LeadCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    lead = lead_service.create_lead(db, data, current_user, ip_address=ip)
    return LeadResponse(
        id=lead.id,
        lead_code=lead.lead_code,
        lead_name=lead.lead_name,
        email=lead.email,
        phone=lead.phone,
        company_name=lead.company_name,
        source=lead.source,
        status=lead.status,
        priority=lead.priority,
        expected_value=lead.expected_value,
        notes=lead.notes,
        assigned_to=lead.assigned_to,
        assigned_user_name=lead.assigned_user.name if lead.assigned_user else current_user.name,
        converted_customer_id=lead.converted_customer_id,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = lead_service.get_by_id(db, lead_id, current_user)
    return LeadResponse(
        id=lead.id,
        lead_code=lead.lead_code,
        lead_name=lead.lead_name,
        email=lead.email,
        phone=lead.phone,
        company_name=lead.company_name,
        source=lead.source,
        status=lead.status,
        priority=lead.priority,
        expected_value=lead.expected_value,
        notes=lead.notes,
        assigned_to=lead.assigned_to,
        assigned_user_name=lead.assigned_user.name if lead.assigned_user else None,
        converted_customer_id=lead.converted_customer_id,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: int,
    data: LeadUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    lead = lead_service.update_lead(db, lead_id, data, current_user, ip_address=ip)
    return LeadResponse(
        id=lead.id,
        lead_code=lead.lead_code,
        lead_name=lead.lead_name,
        email=lead.email,
        phone=lead.phone,
        company_name=lead.company_name,
        source=lead.source,
        status=lead.status,
        priority=lead.priority,
        expected_value=lead.expected_value,
        notes=lead.notes,
        assigned_to=lead.assigned_to,
        assigned_user_name=lead.assigned_user.name if lead.assigned_user else None,
        converted_customer_id=lead.converted_customer_id,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


@router.post("/{lead_id}/convert", response_model=LeadConvertResponse)
def convert_lead(
    lead_id: int,
    data: LeadConvertRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    customer, opp = lead_service.convert_lead(db, lead_id, data, current_user, ip_address=ip)

    cust_resp = CustomerResponse(
        id=customer.id,
        customer_code=customer.customer_code,
        customer_name=customer.customer_name,
        email=customer.email,
        phone=customer.phone,
        company_name=customer.company_name,
        address=customer.address,
        city=customer.city,
        state=customer.state,
        status=customer.status,
        created_by=customer.created_by,
        creator_name=customer.creator.name if customer.creator else None,
        created_at=customer.created_at,
        updated_at=customer.updated_at,
    )
    opp_resp = None
    if opp:
        opp_resp = OpportunityResponse(
            id=opp.id,
            opportunity_name=opp.opportunity_name,
            customer_id=opp.customer_id,
            customer_name=customer.customer_name,
            lead_id=opp.lead_id,
            amount=opp.amount,
            stage=opp.stage,
            probability=opp.probability,
            weighted_value=opp.weighted_value,
            expected_close_date=opp.expected_close_date,
            status=opp.status,
            assigned_to=opp.assigned_to,
            assigned_user_name=current_user.name,
            notes=opp.notes,
            created_at=opp.created_at,
            updated_at=opp.updated_at,
        )

    return LeadConvertResponse(
        customer=cust_resp,
        opportunity=opp_resp,
        message=f"Lead successfully converted to Customer {customer.customer_code}.",
    )


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    lead_service.delete_lead(db, lead_id, current_user, ip_address=ip)
    return None
