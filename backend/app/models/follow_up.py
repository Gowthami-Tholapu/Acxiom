from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.customer import Customer
    from app.models.lead import Lead
    from app.models.opportunity import Opportunity


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=True)
    lead_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=True)
    opportunity_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=True)
    follow_up_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    follow_up_type: Mapped[str] = mapped_column(String(50), default="Call", nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Planned", nullable=False, index=True)
    assigned_to: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    customer: Mapped[Optional["Customer"]] = relationship("Customer", back_populates="follow_ups")
    lead: Mapped[Optional["Lead"]] = relationship("Lead", back_populates="follow_ups")
    opportunity: Mapped[Optional["Opportunity"]] = relationship("Opportunity", back_populates="follow_ups")
    assigned_user: Mapped["User"] = relationship("User", back_populates="follow_ups")

    def __repr__(self) -> str:
        return f"<FollowUp id={self.id} subject={self.subject} status={self.status} date={self.follow_up_date}>"
