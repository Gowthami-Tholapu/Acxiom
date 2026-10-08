from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

VALID_ACTIVITY_TYPES = ["Call", "Meeting", "Email", "Task"]
VALID_ACTIVITY_STATUSES = ["Planned", "Completed", "Cancelled"]


class ActivityBase(BaseModel):
    activity_type: str = Field(..., max_length=50)
    subject: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    activity_date: datetime
    customer_id: Optional[int] = None
    lead_id: Optional[int] = None
    status: str = Field("Completed", max_length=30)

    @field_validator("activity_type")
    @classmethod
    def check_type(cls, v: str) -> str:
        if v not in VALID_ACTIVITY_TYPES:
            raise ValueError(f"Invalid activity type. Must be one of: {', '.join(VALID_ACTIVITY_TYPES)}")
        return v

    @field_validator("status")
    @classmethod
    def check_status(cls, v: str) -> str:
        if v not in VALID_ACTIVITY_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(VALID_ACTIVITY_STATUSES)}")
        return v


class ActivityCreate(ActivityBase):
    assigned_to: Optional[int] = None


class ActivityUpdate(BaseModel):
    activity_type: Optional[str] = None
    subject: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    activity_date: Optional[datetime] = None
    customer_id: Optional[int] = None
    lead_id: Optional[int] = None
    status: Optional[str] = None
    assigned_to: Optional[int] = None

    @field_validator("activity_type")
    @classmethod
    def check_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_ACTIVITY_TYPES:
            raise ValueError(f"Invalid activity type. Must be one of: {', '.join(VALID_ACTIVITY_TYPES)}")
        return v

    @field_validator("status")
    @classmethod
    def check_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_ACTIVITY_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(VALID_ACTIVITY_STATUSES)}")
        return v


class ActivityResponse(BaseModel):
    id: int
    activity_type: str
    subject: str
    description: Optional[str] = None
    activity_date: datetime
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    lead_id: Optional[int] = None
    lead_name: Optional[str] = None
    assigned_to: int
    assigned_user_name: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
