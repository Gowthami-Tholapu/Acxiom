from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_password_hash, validate_password_strength
from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.audit_service import audit_service


class UserService:
    @staticmethod
    def list_roles(db: Session) -> List[Role]:
        return db.scalars(select(Role).order_by(Role.id)).all()

    @staticmethod
    def list_users(
        db: Session,
        *,
        search: Optional[str] = None,
        role_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[User], int]:
        stmt = select(User).options(joinedload(User.role))
        count_stmt = select(func.count(User.id))

        if search:
            pattern = f"%{search.strip()}%"
            stmt = stmt.where((User.name.ilike(pattern)) | (User.email.ilike(pattern)))
            count_stmt = count_stmt.where((User.name.ilike(pattern)) | (User.email.ilike(pattern)))
        if role_id is not None:
            stmt = stmt.where(User.role_id == role_id)
            count_stmt = count_stmt.where(User.role_id == role_id)
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
            count_stmt = count_stmt.where(User.is_active == is_active)

        total = db.scalar(count_stmt) or 0
        users = db.scalars(stmt.order_by(desc(User.created_at)).offset(skip).limit(limit)).all()
        return users, total

    @staticmethod
    def get_by_id(db: Session, user_id: int) -> User:
        user = db.scalar(
            select(User).options(joinedload(User.role)).where(User.id == user_id)
        )
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        return user

    @staticmethod
    def create_user(
        db: Session,
        data: UserCreate,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> User:
        is_valid_pw, pw_err = validate_password_strength(data.password)
        if not is_valid_pw:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_err)

        existing = db.scalar(select(User).where(User.email == data.email.strip().lower()))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email address already exists."
            )

        role = db.scalar(select(Role).where(Role.id == data.role_id))
        if not role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected role does not exist.")

        new_user = User(
            name=data.name.strip(),
            email=data.email.strip().lower(),
            password_hash=get_password_hash(data.password),
            role_id=role.id,
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        audit_service.log_event(
            db,
            action="CREATE",
            entity_name="User",
            record_id=new_user.id,
            user_id=current_user.id,
            new_value={"name": new_user.name, "email": new_user.email, "role": role.name},
            details=f"Admin created user {new_user.email}",
            ip_address=ip_address,
        )
        db.commit()
        return new_user

    @staticmethod
    def update_user(
        db: Session,
        user_id: int,
        data: UserUpdate,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> User:
        user = UserService.get_by_id(db, user_id)
        old_val = {"name": user.name, "email": user.email, "role_id": user.role_id, "is_active": user.is_active}

        if data.email and data.email.strip().lower() != user.email:
            existing = db.scalar(select(User).where(User.email == data.email.strip().lower()))
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use.")
            user.email = data.email.strip().lower()

        if data.name:
            user.name = data.name.strip()
        if data.role_id is not None:
            role = db.scalar(select(Role).where(Role.id == data.role_id))
            if not role:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role ID.")
            user.role_id = role.id
        if data.is_active is not None:
            user.is_active = data.is_active

        db.add(user)
        db.commit()
        db.refresh(user)

        new_val = {"name": user.name, "email": user.email, "role_id": user.role_id, "is_active": user.is_active}
        audit_service.log_event(
            db,
            action="UPDATE",
            entity_name="User",
            record_id=user.id,
            user_id=current_user.id,
            old_value=old_val,
            new_value=new_val,
            details=f"Updated user details for {user.email}",
            ip_address=ip_address,
        )
        db.commit()
        return user

    @staticmethod
    def update_status(
        db: Session,
        user_id: int,
        is_active: bool,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> User:
        user = UserService.get_by_id(db, user_id)
        if user.id == current_user.id and not is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate yourself.")

        old_status = user.is_active
        user.is_active = is_active
        if is_active:
            # Unlock when reactivated
            user.failed_login_count = 0
            user.lockout_end = None

        db.add(user)
        db.commit()
        db.refresh(user)

        audit_service.log_event(
            db,
            action="STATUS_CHANGE",
            entity_name="User",
            record_id=user.id,
            user_id=current_user.id,
            old_value={"is_active": old_status},
            new_value={"is_active": is_active},
            details=f"Admin set active status of {user.email} to {is_active}",
            ip_address=ip_address,
        )
        db.commit()
        return user

    @staticmethod
    def update_role(
        db: Session,
        user_id: int,
        role_id: int,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> User:
        user = UserService.get_by_id(db, user_id)
        role = db.scalar(select(Role).where(Role.id == role_id))
        if not role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role does not exist.")

        old_role_id = user.role_id
        user.role_id = role.id
        db.add(user)
        db.commit()
        db.refresh(user)

        audit_service.log_event(
            db,
            action="ROLE_CHANGE",
            entity_name="User",
            record_id=user.id,
            user_id=current_user.id,
            old_value={"role_id": old_role_id},
            new_value={"role_id": role.id, "role_name": role.name},
            details=f"Admin changed role of {user.email} to {role.name}",
            ip_address=ip_address,
        )
        db.commit()
        return user

    @staticmethod
    def reset_password(
        db: Session,
        user_id: int,
        new_password: str,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> User:
        user = UserService.get_by_id(db, user_id)
        is_valid_pw, pw_err = validate_password_strength(new_password)
        if not is_valid_pw:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_err)

        user.password_hash = get_password_hash(new_password)
        user.failed_login_count = 0
        user.lockout_end = None
        db.add(user)
        db.commit()
        db.refresh(user)

        audit_service.log_event(
            db,
            action="PASSWORD_RESET",
            entity_name="User",
            record_id=user.id,
            user_id=current_user.id,
            details=f"Admin reset password for user {user.email}",
            ip_address=ip_address,
        )
        db.commit()
        return user


user_service = UserService()
