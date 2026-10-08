from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse
from app.services.audit_service import audit_service
from app.utils.pagination import PaginatedResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=PaginatedResponse[AuditLogResponse])
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = None,
    entity_name: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    logs, total = audit_service.get_logs(
        db,
        user_id=user_id,
        entity_name=entity_name,
        action=action,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=page_size,
    )
    items = [
        AuditLogResponse(
            id=l.id,
            user_id=l.user_id,
            user_name=l.user.name if l.user else None,
            action=l.action,
            entity_name=l.entity_name,
            record_id=l.record_id,
            old_value=l.old_value,
            new_value=l.new_value,
            ip_address=l.ip_address,
            details=l.details,
            created_at=l.created_at,
        )
        for l in logs
    ]
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)
