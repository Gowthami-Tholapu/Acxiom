from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, func, or_, desc
from sqlalchemy.orm import Session, joinedload

from app.models.customer import Customer
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.audit_service import audit_service
from app.utils.filters import apply_scope_filter, verify_record_access
from app.utils.validators import validate_email_format, validate_phone_format


class CustomerService:
    @staticmethod
    def _generate_customer_code(db: Session) -> str:
        count = db.scalar(select(func.count(Customer.id))) or 0
        return f"CUST-{(count + 1):04d}"

    @staticmethod
    def list_customers(
        db: Session,
        current_user: User,
        *,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        city: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Customer], int]:
        stmt = select(Customer).options(joinedload(Customer.creator))
        stmt = apply_scope_filter(stmt, Customer, current_user, owner_column_name="created_by")

        count_stmt = select(func.count(Customer.id))
        count_stmt = apply_scope_filter(count_stmt, Customer, current_user, owner_column_name="created_by")

        if search:
            pattern = f"%{search.strip()}%"
            filter_cond = or_(
                Customer.customer_name.ilike(pattern),
                Customer.email.ilike(pattern),
                Customer.phone.ilike(pattern),
                Customer.company_name.ilike(pattern),
                Customer.customer_code.ilike(pattern),
            )
            stmt = stmt.where(filter_cond)
            count_stmt = count_stmt.where(filter_cond)

        if status_filter:
            stmt = stmt.where(Customer.status == status_filter)
            count_stmt = count_stmt.where(Customer.status == status_filter)

        if city:
            stmt = stmt.where(Customer.city.ilike(f"%{city.strip()}%"))
            count_stmt = count_stmt.where(Customer.city.ilike(f"%{city.strip()}%"))

        total = db.scalar(count_stmt) or 0
        items = db.scalars(
            stmt.order_by(desc(Customer.created_at)).offset(skip).limit(limit)
        ).all()
        return items, total

    @staticmethod
    def get_by_id(db: Session, customer_id: int, current_user: User) -> Customer:
        customer = db.scalar(
            select(Customer).options(joinedload(Customer.creator)).where(Customer.id == customer_id)
        )
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

        verify_record_access(customer, current_user, owner_column_name="created_by")
        return customer

    @staticmethod
    def create_customer(
        db: Session,
        data: CustomerCreate,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> Customer:
        # Validate email format
        if not validate_email_format(data.email):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email address.")

        # Validate phone format
        if not validate_phone_format(data.phone):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid phone number.")

        email_clean = data.email.strip().lower()
        phone_clean = data.phone.strip()

        # Email uniqueness
        if db.scalar(select(Customer).where(Customer.email == email_clean)):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A customer with this email already exists.")

        # Phone uniqueness
        if db.scalar(select(Customer).where(Customer.phone == phone_clean)):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A customer with this phone already exists.")

        # Duplicate customer detection (same name & company)
        if data.company_name:
            dup = db.scalar(
                select(Customer).where(
                    Customer.customer_name.ilike(data.customer_name.strip()),
                    Customer.company_name.ilike(data.company_name.strip())
                )
            )
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Duplicate detected: Customer '{data.customer_name}' at company '{data.company_name}' already exists."
                )

        code = CustomerService._generate_customer_code(db)
        customer = Customer(
            customer_code=code,
            customer_name=data.customer_name.strip(),
            email=email_clean,
            phone=phone_clean,
            company_name=data.company_name.strip() if data.company_name else None,
            address=data.address.strip() if data.address else None,
            city=data.city.strip() if data.city else None,
            state=data.state.strip() if data.state else None,
            status=data.status,
            created_by=current_user.id,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

        audit_service.log_event(
            db,
            action="CREATE",
            entity_name="Customer",
            record_id=customer.id,
            user_id=current_user.id,
            new_value={
                "customer_code": customer.customer_code,
                "name": customer.customer_name,
                "email": customer.email,
                "phone": customer.phone,
                "status": customer.status,
            },
            details=f"Customer {customer.customer_name} ({customer.customer_code}) created",
            ip_address=ip_address,
        )
        db.commit()
        return customer

    @staticmethod
    def update_customer(
        db: Session,
        customer_id: int,
        data: CustomerUpdate,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> Customer:
        customer = CustomerService.get_by_id(db, customer_id, current_user)
        old_val = {
            "customer_name": customer.customer_name,
            "email": customer.email,
            "phone": customer.phone,
            "status": customer.status,
            "company_name": customer.company_name,
        }

        if data.email:
            if not validate_email_format(data.email):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email address.")
            email_clean = data.email.strip().lower()
            if email_clean != customer.email:
                if db.scalar(select(Customer).where(Customer.email == email_clean)):
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A customer with this email already exists.")
                customer.email = email_clean

        if data.phone:
            if not validate_phone_format(data.phone):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid phone number.")
            phone_clean = data.phone.strip()
            if phone_clean != customer.phone:
                if db.scalar(select(Customer).where(Customer.phone == phone_clean)):
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A customer with this phone already exists.")
                customer.phone = phone_clean

        if data.customer_name is not None:
            customer.customer_name = data.customer_name.strip()
        if data.company_name is not None:
            customer.company_name = data.company_name.strip() or None
        if data.address is not None:
            customer.address = data.address.strip() or None
        if data.city is not None:
            customer.city = data.city.strip() or None
        if data.state is not None:
            customer.state = data.state.strip() or None
        if data.status is not None:
            customer.status = data.status

        db.add(customer)
        db.commit()
        db.refresh(customer)

        new_val = {
            "customer_name": customer.customer_name,
            "email": customer.email,
            "phone": customer.phone,
            "status": customer.status,
            "company_name": customer.company_name,
        }
        audit_service.log_event(
            db,
            action="UPDATE",
            entity_name="Customer",
            record_id=customer.id,
            user_id=current_user.id,
            old_value=old_val,
            new_value=new_val,
            details=f"Customer {customer.customer_name} updated",
            ip_address=ip_address,
        )
        db.commit()
        return customer

    @staticmethod
    def delete_customer(
        db: Session,
        customer_id: int,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> None:
        customer = CustomerService.get_by_id(db, customer_id, current_user)
        old_val = {"customer_code": customer.customer_code, "customer_name": customer.customer_name}

        # Check if customer has active opportunities
        if customer.opportunities:
            # Soft deactivation preferred to prevent orphaned data integrity issues
            customer.status = "Inactive"
            db.add(customer)
            db.commit()
            audit_service.log_event(
                db,
                action="DELETE",
                entity_name="Customer",
                record_id=customer.id,
                user_id=current_user.id,
                old_value=old_val,
                new_value={"status": "Inactive"},
                details=f"Customer {customer.customer_name} deactivated because associated opportunities exist.",
                ip_address=ip_address,
            )
            db.commit()
            return

        db.delete(customer)
        db.commit()
        audit_service.log_event(
            db,
            action="DELETE",
            entity_name="Customer",
            record_id=customer_id,
            user_id=current_user.id,
            old_value=old_val,
            details=f"Customer {old_val['customer_name']} deleted",
            ip_address=ip_address,
        )
        db.commit()


customer_service = CustomerService()
