from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.opportunity import Opportunity
    from app.models.follow_up import FollowUp
    from app.models.activity import Activity
    from app.models.lead import Lead


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Active", nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    creator: Mapped["User"] = relationship("User", back_populates="customers")
    opportunities: Mapped[List["Opportunity"]] = relationship("Opportunity", back_populates="customer", cascade="all, delete-orphan")
    follow_ups: Mapped[List["FollowUp"]] = relationship("FollowUp", back_populates="customer")
    activities: Mapped[List["Activity"]] = relationship("Activity", back_populates="customer")
    leads: Mapped[List["Lead"]] = relationship("Lead", back_populates="converted_customer")

    def __repr__(self) -> str:
        return f"<Customer id={self.id} code={self.customer_code} name={self.customer_name}>"
