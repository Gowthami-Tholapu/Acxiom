from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.schemas.activity import ActivityResponse
from app.schemas.follow_up import FollowUpResponse


class DashboardKPIs(BaseModel):
    total_customers: int
    total_leads: int
    open_leads: int
    total_opportunities: int
    open_opportunities: int
    won_opportunities: int
    lost_opportunities: int
    total_pipeline_value: float
    weighted_pipeline_value: float


class ChartDataset(BaseModel):
    label: str
    data: List[float]
    backgroundColor: Optional[Any] = None
    borderColor: Optional[Any] = None
    borderWidth: Optional[int] = 1


class ChartData(BaseModel):
    labels: List[str]
    datasets: List[ChartDataset]


class DashboardResponse(BaseModel):
    kpis: DashboardKPIs
    lead_status_chart: ChartData
    opportunity_pipeline_chart: ChartData
    monthly_sales_chart: ChartData
    recent_activities: List[ActivityResponse]
    upcoming_follow_ups: List[FollowUpResponse]
