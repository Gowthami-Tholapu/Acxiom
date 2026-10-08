from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

VALID_FOLLOW_UP_TYPES = ["Call", "Meeting", "Email", "Task"]
VALID_FOLLOW_UP_STATUSES = ["Planned", "Completed", "Missed", "Cancelled"]


class FollowUpBase(BaseModel):
    customer_id: Optional[int] = None
    lead_id: Optional[int] = None
    opportunity_id: Optional[int] = None
    follow_up_date: datetime
    follow_up_type: str = Field("Call", max_length=50)
    subject: str = Field(..., min_length=2, max_length=200)
    remarks: Optional[str] = None
    status: str = Field("Planned", max_length=30)

    @field_validator("follow_up_type")
    @classmethod
    def check_type(cls, v: str) -> str:
        if v not in VALID_FOLLOW_UP_TYPES:
            raise ValueError(f"Invalid follow-up type. Must be one of: {', '.join(VALID_FOLLOW_UP_TYPES)}")
        return v

    @field_validator("status")
    @classmethod
    def check_status(cls, v: str) -> str:
        if v not in VALID_FOLLOW_UP_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(VALID_FOLLOW_UP_STATUSES)}")
        return v


class FollowUpCreate(FollowUpBase):
    assigned_to: Optional[int] = None


class FollowUpUpdate(BaseModel):
    customer_id: Optional[int] = None
    lead_id: Optional[int] = None
    opportunity_id: Optional[int] = None
    follow_up_date: Optional[datetime] = None
    follow_up_type: Optional[str] = None
    subject: Optional[str] = Field(None, min_length=2, max_length=200)
    remarks: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[int] = None

    @field_validator("follow_up_type")
    @classmethod
    def check_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_FOLLOW_UP_TYPES:
            raise ValueError(f"Invalid follow-up type. Must be one of: {', '.join(VALID_FOLLOW_UP_TYPES)}")
        return v

    @field_validator("status")
    @classmethod
    def check_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_FOLLOW_UP_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(VALID_FOLLOW_UP_STATUSES)}")
        return v


class FollowUpResponse(BaseModel):
    id: int
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    lead_id: Optional[int] = None
    lead_name: Optional[str] = None
    opportunity_id: Optional[int] = None
    opportunity_name: Optional[str] = None
    follow_up_date: datetime
    follow_up_type: str
    subject: str
    remarks: Optional[str] = None
    status: str
    assigned_to: int
    assigned_user_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
