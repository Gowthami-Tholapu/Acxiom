from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_client_ip, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate
from app.services.customer_service import customer_service
from app.utils.pagination import PaginatedResponse

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=PaginatedResponse[CustomerResponse])
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    city: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    customers, total = customer_service.list_customers(
        db,
        current_user,
        search=search,
        status_filter=status,
        city=city,
        skip=skip,
        limit=page_size,
    )
    items = [
        CustomerResponse(
            id=c.id,
            customer_code=c.customer_code,
            customer_name=c.customer_name,
            email=c.email,
            phone=c.phone,
            company_name=c.company_name,
            address=c.address,
            city=c.city,
            state=c.state,
            status=c.status,
            created_by=c.created_by,
            creator_name=c.creator.name if c.creator else None,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in customers
    ]
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    data: CustomerCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    c = customer_service.create_customer(db, data, current_user, ip_address=ip)
    return CustomerResponse(
        id=c.id,
        customer_code=c.customer_code,
        customer_name=c.customer_name,
        email=c.email,
        phone=c.phone,
        company_name=c.company_name,
        address=c.address,
        city=c.city,
        state=c.state,
        status=c.status,
        created_by=c.created_by,
        creator_name=c.creator.name if c.creator else current_user.name,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = customer_service.get_by_id(db, customer_id, current_user)
    return CustomerResponse(
        id=c.id,
        customer_code=c.customer_code,
        customer_name=c.customer_name,
        email=c.email,
        phone=c.phone,
        company_name=c.company_name,
        address=c.address,
        city=c.city,
        state=c.state,
        status=c.status,
        created_by=c.created_by,
        creator_name=c.creator.name if c.creator else None,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    data: CustomerUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    c = customer_service.update_customer(db, customer_id, data, current_user, ip_address=ip)
    return CustomerResponse(
        id=c.id,
        customer_code=c.customer_code,
        customer_name=c.customer_name,
        email=c.email,
        phone=c.phone,
        company_name=c.company_name,
        address=c.address,
        city=c.city,
        state=c.state,
        status=c.status,
        created_by=c.created_by,
        creator_name=c.creator.name if c.creator else None,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    customer_service.delete_customer(db, customer_id, current_user, ip_address=ip)
    return None
