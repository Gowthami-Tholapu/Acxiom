from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.role import Role
    from app.models.customer import Customer
    from app.models.lead import Lead
    from app.models.opportunity import Opportunity
    from app.models.follow_up import FollowUp
    from app.models.activity import Activity
    from app.models.audit_log import AuditLog


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    lockout_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    role: Mapped["Role"] = relationship("Role", back_populates="users")
    customers: Mapped[List["Customer"]] = relationship("Customer", back_populates="creator")
    leads: Mapped[List["Lead"]] = relationship("Lead", back_populates="assigned_user", foreign_keys="Lead.assigned_to")
    opportunities: Mapped[List["Opportunity"]] = relationship("Opportunity", back_populates="assigned_user")
    follow_ups: Mapped[List["FollowUp"]] = relationship("FollowUp", back_populates="assigned_user")
    activities: Mapped[List["Activity"]] = relationship("Activity", back_populates="assigned_user")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="user")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role_id={self.role_id}>"
