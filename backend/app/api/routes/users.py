from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_client_ip,
    get_current_user,
    require_admin,
    require_manager_or_admin,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.role import RoleResponse
from app.schemas.user import (
    UserCreate,
    UserResetPassword,
    UserResponse,
    UserRoleUpdate,
    UserStatusUpdate,
    UserUpdate,
)
from app.services.user_service import user_service
from app.utils.pagination import PaginatedResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/roles", response_model=List[RoleResponse])
def get_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    roles = user_service.list_roles(db)
    return [RoleResponse.model_validate(r) for r in roles]


@router.get("", response_model=PaginatedResponse[UserResponse])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    users, total = user_service.list_users(
        db,
        search=search,
        role_id=role_id,
        is_active=is_active,
        skip=skip,
        limit=page_size,
    )
    items = [UserResponse.model_validate(u) for u in users]
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    user = user_service.create_user(db, data, current_user, ip_address=ip)
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    user = user_service.get_by_id(db, user_id)
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    user = user_service.update_user(db, user_id, data, current_user, ip_address=ip)
    return UserResponse.model_validate(user)


@router.patch("/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    user = user_service.update_status(db, user_id, data.is_active, current_user, ip_address=ip)
    return UserResponse.model_validate(user)


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    user = user_service.update_role(db, user_id, data.role_id, current_user, ip_address=ip)
    return UserResponse.model_validate(user)


@router.post("/{user_id}/reset-password", response_model=UserResponse)
def reset_password(
    user_id: int,
    data: UserResetPassword,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    user = user_service.reset_password(db, user_id, data.new_password, current_user, ip_address=ip)
    return UserResponse.model_validate(user)
