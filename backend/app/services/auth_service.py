from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_password_hash,
    is_user_locked_out,
    validate_password_strength,
    verify_password,
)
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.audit_service import audit_service


class AuthService:
    @staticmethod
    def register(db: Session, data: RegisterRequest, ip_address: Optional[str] = None) -> Tuple[str, User]:
        # Validate password policy
        is_valid_pw, pw_err = validate_password_strength(data.password)
        if not is_valid_pw:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_err)

        # Check unique email
        existing = db.scalar(select(User).where(User.email == data.email.strip().lower()))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists."
            )

        # Safe default role: SalesExecutive
        sales_role = db.scalar(select(Role).where(Role.name == "SalesExecutive"))
        if not sales_role:
            # Fallback or create if not yet seeded
            sales_role = Role(name="SalesExecutive")
            db.add(sales_role)
            db.flush()

        new_user = User(
            name=data.name.strip(),
            email=data.email.strip().lower(),
            password_hash=get_password_hash(data.password),
            role_id=sales_role.id,
            is_active=True,
            failed_login_count=0,
            lockout_end=None,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Audit registration
        audit_service.log_event(
            db,
            action="CREATE",
            entity_name="User",
            record_id=new_user.id,
            user_id=new_user.id,
            details=f"User {new_user.email} registered with default role {sales_role.name}",
            ip_address=ip_address,
        )
        db.commit()

        # Generate JWT
        token = create_access_token(
            data={"sub": str(new_user.id), "role": sales_role.name, "email": new_user.email}
        )
        return token, new_user

    @staticmethod
    def login(db: Session, data: LoginRequest, ip_address: Optional[str] = None) -> Tuple[str, User]:
        email_clean = data.email.strip().lower()
        user = db.scalar(
            select(User).options(joinedload(User.role)).where(User.email == email_clean)
        )

        if not user:
            audit_service.log_event(
                db,
                action="LOGIN_FAILED",
                entity_name="Auth",
                details=f"Failed login attempt for nonexistent email: {email_clean}",
                ip_address=ip_address,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        # Check lockout
        if is_user_locked_out(user.lockout_end):
            lockout_time = user.lockout_end
            if lockout_time.tzinfo is None:
                lockout_time = lockout_time.replace(tzinfo=timezone.utc)
            remaining_mins = max(
                1,
                int((lockout_time - datetime.now(timezone.utc)).total_seconds() // 60)
            )
            audit_service.log_event(
                db,
                action="LOGIN_FAILED",
                entity_name="Auth",
                record_id=user.id,
                user_id=user.id,
                details=f"Login attempt while account locked: {user.email}",
                ip_address=ip_address,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is temporarily locked due to repeated failed logins. Please try again in {remaining_mins} minutes or contact an administrator."
            )

        # Check active status
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Please contact an administrator."
            )

        # Verify password
        if not verify_password(data.password, user.password_hash):
            user.failed_login_count += 1
            if user.failed_login_count >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
                user.lockout_end = datetime.now(timezone.utc) + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
                audit_service.log_event(
                    db,
                    action="LOCKOUT",
                    entity_name="Auth",
                    record_id=user.id,
                    user_id=user.id,
                    details=f"User {user.email} locked out after {user.failed_login_count} consecutive failed attempts.",
                    ip_address=ip_address,
                )
            else:
                audit_service.log_event(
                    db,
                    action="LOGIN_FAILED",
                    entity_name="Auth",
                    record_id=user.id,
                    user_id=user.id,
                    details=f"Failed login attempt ({user.failed_login_count}/{settings.MAX_FAILED_LOGIN_ATTEMPTS}) for {user.email}",
                    ip_address=ip_address,
                )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        # Success - reset counters
        user.failed_login_count = 0
        user.lockout_end = None
        db.add(user)

        audit_service.log_event(
            db,
            action="LOGIN",
            entity_name="Auth",
            record_id=user.id,
            user_id=user.id,
            details=f"User {user.email} logged in successfully.",
            ip_address=ip_address,
        )
        db.commit()

        role_name = user.role.name if user.role else "SalesExecutive"
        token = create_access_token(
            data={"sub": str(user.id), "role": role_name, "email": user.email}
        )
        return token, user

    @staticmethod
    def logout(db: Session, user: User, ip_address: Optional[str] = None) -> None:
        audit_service.log_event(
            db,
            action="LOGOUT",
            entity_name="Auth",
            record_id=user.id,
            user_id=user.id,
            details=f"User {user.email} logged out.",
            ip_address=ip_address,
        )
        db.commit()


auth_service = AuthService()
