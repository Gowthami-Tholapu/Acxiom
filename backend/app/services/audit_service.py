import json
from datetime import datetime
from typing import Any, Dict, Optional, Tuple, Union
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session, joinedload
from app.models.audit_log import AuditLog


class AuditService:
    @staticmethod
    def _sanitize(data: Any) -> Any:
        if isinstance(data, dict):
            sanitized = {}
            for k, v in data.items():
                if any(secret in k.lower() for secret in ["password", "token", "secret", "hash"]):
                    sanitized[k] = "******"
                elif isinstance(v, (dict, list)):
                    sanitized[k] = AuditService._sanitize(v)
                elif isinstance(v, (datetime,)):
                    sanitized[k] = v.isoformat()
                else:
                    sanitized[k] = v
            return sanitized
        elif isinstance(data, list):
            return [AuditService._sanitize(item) for item in data]
        return data

    @staticmethod
    def log_event(
        db: Session,
        *,
        action: str,
        entity_name: str,
        record_id: Optional[Union[str, int]] = None,
        user_id: Optional[int] = None,
        old_value: Optional[Union[Dict[str, Any], str]] = None,
        new_value: Optional[Union[Dict[str, Any], str]] = None,
        ip_address: Optional[str] = None,
        details: Optional[str] = None,
    ) -> AuditLog:
        old_str = None
        new_str = None

        if old_value is not None:
            if isinstance(old_value, dict):
                old_str = json.dumps(AuditService._sanitize(old_value))
            else:
                old_str = str(old_value)

        if new_value is not None:
            if isinstance(new_value, dict):
                new_str = json.dumps(AuditService._sanitize(new_value))
            else:
                new_str = str(new_value)

        audit_entry = AuditLog(
            user_id=user_id,
            action=action.upper(),
            entity_name=entity_name,
            record_id=str(record_id) if record_id is not None else None,
            old_value=old_str,
            new_value=new_str,
            ip_address=ip_address,
            details=details,
        )
        db.add(audit_entry)
        # Flush or let outer commit persist
        db.flush()
        return audit_entry

    @staticmethod
    def get_logs(
        db: Session,
        *,
        user_id: Optional[int] = None,
        entity_name: Optional[str] = None,
        action: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[list[AuditLog], int]:
        stmt = select(AuditLog).options(joinedload(AuditLog.user))
        count_stmt = select(func.count(AuditLog.id))

        if user_id is not None:
            stmt = stmt.where(AuditLog.user_id == user_id)
            count_stmt = count_stmt.where(AuditLog.user_id == user_id)
        if entity_name:
            stmt = stmt.where(AuditLog.entity_name.ilike(f"%{entity_name}%"))
            count_stmt = count_stmt.where(AuditLog.entity_name.ilike(f"%{entity_name}%"))
        if action:
            stmt = stmt.where(AuditLog.action == action.upper())
            count_stmt = count_stmt.where(AuditLog.action == action.upper())
        if start_date:
            stmt = stmt.where(AuditLog.created_at >= start_date)
            count_stmt = count_stmt.where(AuditLog.created_at >= start_date)
        if end_date:
            stmt = stmt.where(AuditLog.created_at <= end_date)
            count_stmt = count_stmt.where(AuditLog.created_at <= end_date)

        total = db.scalar(count_stmt) or 0
        items = db.scalars(
            stmt.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
        ).all()

        return items, total


audit_service = AuditService()
