from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from app.utils.validators import validate_phone_format

VALID_LEAD_STATUSES = ["New", "Contacted", "Qualified", "Unqualified", "Converted", "Lost"]
VALID_LEAD_PRIORITIES = ["Low", "Medium", "High", "Urgent"]
VALID_LEAD_SOURCES = ["Website", "Referral", "Cold Call", "Campaign", "Trade Show", "Partner", "Other"]


class LeadBase(BaseModel):
    lead_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=30)
    company_name: Optional[str] = Field(None, max_length=150)
    source: str = Field("Website", max_length=50)
    status: str = Field("New", max_length=30)
    priority: str = Field("Medium", max_length=30)
    expected_value: float = Field(0.0, ge=0.0)
    notes: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        if not validate_phone_format(v):
            raise ValueError("Invalid phone number format. Must contain 10-15 digits.")
        return v.strip()

    @field_validator("status")
    @classmethod
    def check_status(cls, v: str) -> str:
        if v not in VALID_LEAD_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(VALID_LEAD_STATUSES)}")
        return v


class LeadCreate(LeadBase):
    assigned_to: Optional[int] = None


class LeadUpdate(BaseModel):
    lead_name: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=10, max_length=30)
    company_name: Optional[str] = Field(None, max_length=150)
    source: Optional[str] = Field(None, max_length=50)
    status: Optional[str] = Field(None, max_length=30)
    priority: Optional[str] = Field(None, max_length=30)
    expected_value: Optional[float] = Field(None, ge=0.0)
    notes: Optional[str] = None
    assigned_to: Optional[int] = None

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not validate_phone_format(v):
            raise ValueError("Invalid phone number format. Must contain 10-15 digits.")
        return v.strip() if v is not None else v

    @field_validator("status")
    @classmethod
    def check_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_LEAD_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(VALID_LEAD_STATUSES)}")
        return v


class LeadStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def check_status(cls, v: str) -> str:
        if v not in VALID_LEAD_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(VALID_LEAD_STATUSES)}")
        return v


class LeadConvertRequest(BaseModel):
    company_name: Optional[str] = None
    create_opportunity: bool = False
    opportunity_name: Optional[str] = None
    opportunity_amount: Optional[float] = None
    expected_close_date: Optional[date] = None


class LeadResponse(BaseModel):
    id: int
    lead_code: str
    lead_name: str
    email: str
    phone: str
    company_name: Optional[str] = None
    source: str
    status: str
    priority: str
    expected_value: float
    notes: Optional[str] = None
    assigned_to: int
    assigned_user_name: Optional[str] = None
    converted_customer_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
