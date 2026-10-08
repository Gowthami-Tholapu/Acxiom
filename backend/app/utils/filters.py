from typing import Any
from fastapi import HTTPException, status
from app.models.user import User


def apply_scope_filter(query, model: Any, current_user: User, owner_column_name: str = "assigned_to"):
    """
    Applies role-based filtering on a SQLAlchemy select statement:
    - Admin: Full access across all records
    - Manager: Access to team scope records
    - SalesExecutive: Only records where owner_column == current_user.id
    """
    if current_user.role.name in ["Admin", "Manager"]:
        return query
    if current_user.role.name == "SalesExecutive":
        column = getattr(model, owner_column_name)
        return query.where(column == current_user.id)
    return query


def verify_record_access(record: Any, current_user: User, owner_column_name: str = "assigned_to") -> None:
    """
    Ensures that a SalesExecutive can only read, update or delete records assigned to or owned by them.
    Raises 403 Forbidden if unauthorized.
    """
    if current_user.role.name in ["Admin", "Manager"]:
        return

    record_owner_id = getattr(record, owner_column_name, None)
    if record_owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to access or modify this record."
        )
