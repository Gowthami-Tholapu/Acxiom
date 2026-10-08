from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_current_user,
    require_admin,
    require_manager_or_admin,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse
from app.schemas.reports import (
    ConversionReportResponse,
    CustomerReportItem,
    FollowUpReportItem,
    LeadReportItem,
    OpportunityReportItem,
    PipelineReportResponse,
    UserActivityReportItem,
)
from app.services.audit_service import audit_service
from app.services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/customers", response_model=List[CustomerReportItem])
def customer_report(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_service.get_customer_report(db, current_user, status=status)


@router.get("/customers/csv")
def customer_report_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    csv_data = report_service.export_customers_csv(db, current_user)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=customers_report.csv"},
    )


@router.get("/leads", response_model=List[LeadReportItem])
def lead_report(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_service.get_lead_report(db, current_user, status=status)


@router.get("/leads/csv")
def lead_report_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    csv_data = report_service.export_leads_csv(db, current_user)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_report.csv"},
    )


@router.get("/followups", response_model=List[FollowUpReportItem])
def follow_up_report(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_service.get_follow_up_report(db, current_user, status=status)


@router.get("/followups/csv")
def follow_up_report_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    csv_data = report_service.export_follow_ups_csv(db, current_user)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=followups_report.csv"},
    )


@router.get("/opportunities", response_model=List[OpportunityReportItem])
def opportunity_report(
    stage: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_service.get_opportunity_report(db, current_user, stage=stage)


@router.get("/opportunities/csv")
def opportunity_report_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    csv_data = report_service.export_opportunities_csv(db, current_user)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=opportunities_report.csv"},
    )


@router.get("/pipeline", response_model=PipelineReportResponse)
def pipeline_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_service.get_pipeline_report(db, current_user)


@router.get("/conversions", response_model=ConversionReportResponse)
def conversion_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_service.get_conversion_report(db, current_user)


@router.get("/user-activity", response_model=List[UserActivityReportItem])
def user_activity_report(
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    return report_service.get_user_activity_report(db)


@router.get("/audit", response_model=List[AuditLogResponse])
def audit_report(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    logs, _ = audit_service.get_logs(db, skip=0, limit=200)
    return [
        AuditLogResponse(
            id=l.id,
            user_id=l.user_id,
            user_name=l.user.name if l.user else None,
            action=l.action,
            entity_name=l.entity_name,
            record_id=l.record_id,
            old_value=l.old_value,
            new_value=l.new_value,
            ip_address=l.ip_address,
            details=l.details,
            created_at=l.created_at,
        )
        for l in logs
    ]
