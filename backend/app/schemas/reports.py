from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


class CustomerReportItem(BaseModel):
    id: int
    customer_code: str
    customer_name: str
    email: str
    phone: str
    company_name: Optional[str] = None
    status: str
    created_by: str
    created_at: datetime


class LeadReportItem(BaseModel):
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
    assigned_to: str
    created_at: datetime
    is_converted: bool


class FollowUpReportItem(BaseModel):
    id: int
    subject: str
    follow_up_type: str
    follow_up_date: datetime
    status: str
    related_to: str
    assigned_to: str
    is_overdue: bool


class OpportunityReportItem(BaseModel):
    id: int
    opportunity_name: str
    customer_name: str
    stage: str
    amount: float
    probability: float
    weighted_value: float
    expected_close_date: date
    status: str
    assigned_to: str


class PipelineStageSummary(BaseModel):
    stage: str
    count: int
    total_amount: float
    weighted_amount: float


class PipelineReportResponse(BaseModel):
    stages: List[PipelineStageSummary]
    total_pipeline_value: float
    total_weighted_value: float


class ConversionReportResponse(BaseModel):
    total_leads: int
    converted_leads: int
    conversion_rate_percentage: float
    total_opportunities_created: int
    won_opportunities_count: int
    total_won_value: float


class UserActivityReportItem(BaseModel):
    user_id: int
    user_name: str
    role_name: str
    customers_created: int
    leads_managed: int
    opportunities_managed: int
    follow_ups_completed: int
    activities_recorded: int
