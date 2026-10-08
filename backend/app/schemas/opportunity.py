from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

VALID_OPPORTUNITY_STAGES = ["Qualification", "Proposal", "Negotiation", "Won", "Lost"]
VALID_OPPORTUNITY_STATUSES = ["Open", "Won", "Lost"]


class OpportunityBase(BaseModel):
    opportunity_name: str = Field(..., min_length=2, max_length=150)
    customer_id: int
    lead_id: Optional[int] = None
    amount: float = Field(...)
    stage: str = Field("Qualification", max_length=50)
    probability: float = Field(10.0, ge=0.0, le=100.0)
    expected_close_date: date
    notes: Optional[str] = None

    @field_validator("stage")
    @classmethod
    def check_stage(cls, v: str) -> str:
        if v not in VALID_OPPORTUNITY_STAGES:
            raise ValueError(f"Invalid stage. Must be one of: {', '.join(VALID_OPPORTUNITY_STAGES)}")
        return v

    @field_validator("amount")
    @classmethod
    def check_amount(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Opportunity Amount cannot be negative.")
        return v


class OpportunityCreate(OpportunityBase):
    assigned_to: Optional[int] = None


class OpportunityUpdate(BaseModel):
    opportunity_name: Optional[str] = Field(None, min_length=2, max_length=150)
    customer_id: Optional[int] = None
    lead_id: Optional[int] = None
    amount: Optional[float] = None
    stage: Optional[str] = None
    probability: Optional[float] = Field(None, ge=0.0, le=100.0)
    expected_close_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None

    @field_validator("stage")
    @classmethod
    def check_stage(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_OPPORTUNITY_STAGES:
            raise ValueError(f"Invalid stage. Must be one of: {', '.join(VALID_OPPORTUNITY_STAGES)}")
        return v

    @field_validator("amount")
    @classmethod
    def check_amount(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Opportunity Amount cannot be negative.")
        return v


class OpportunityResponse(BaseModel):
    id: int
    opportunity_name: str
    customer_id: int
    customer_name: Optional[str] = None
    lead_id: Optional[int] = None
    amount: float
    stage: str
    probability: float
    weighted_value: float
    expected_close_date: date
    status: str
    assigned_to: int
    assigned_user_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
