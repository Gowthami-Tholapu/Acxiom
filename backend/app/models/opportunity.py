from datetime import datetime, date
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Integer, String, Float, Text, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.customer import Customer
    from app.models.lead import Lead
    from app.models.follow_up import FollowUp


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    opportunity_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    lead_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    stage: Mapped[str] = mapped_column(String(50), default="Qualification", nullable=False, index=True)
    probability: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    expected_close_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="Open", nullable=False, index=True)
    assigned_to: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    customer: Mapped["Customer"] = relationship("Customer", back_populates="opportunities")
    lead: Mapped[Optional["Lead"]] = relationship("Lead", back_populates="opportunities")
    assigned_user: Mapped["User"] = relationship("User", back_populates="opportunities")
    follow_ups: Mapped[List["FollowUp"]] = relationship("FollowUp", back_populates="opportunity")

    @property
    def weighted_value(self) -> float:
        return round((self.amount * self.probability) / 100.0, 2)

    def __repr__(self) -> str:
        return f"<Opportunity id={self.id} name={self.opportunity_name} stage={self.stage} amount={self.amount}>"
