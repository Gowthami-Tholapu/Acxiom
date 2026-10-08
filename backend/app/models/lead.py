from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.customer import Customer
    from app.models.opportunity import Opportunity
    from app.models.follow_up import FollowUp
    from app.models.activity import Activity


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    lead_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    lead_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="Website", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="New", nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(30), default="Medium", nullable=False)
    expected_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    assigned_to: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    converted_customer_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    assigned_user: Mapped["User"] = relationship("User", back_populates="leads", foreign_keys=[assigned_to])
    converted_customer: Mapped[Optional["Customer"]] = relationship("Customer", back_populates="leads")
    opportunities: Mapped[List["Opportunity"]] = relationship("Opportunity", back_populates="lead")
    follow_ups: Mapped[List["FollowUp"]] = relationship("FollowUp", back_populates="lead")
    activities: Mapped[List["Activity"]] = relationship("Activity", back_populates="lead")

    def __repr__(self) -> str:
        return f"<Lead id={self.id} code={self.lead_code} name={self.lead_name} status={self.status}>"
