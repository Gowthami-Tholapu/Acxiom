import csv
import io
from datetime import datetime, date
from typing import Any, List, Optional
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session, joinedload

from app.models.activity import Activity
from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.follow_up import FollowUp
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.user import User
from app.schemas.reports import (
    ConversionReportResponse,
    CustomerReportItem,
    FollowUpReportItem,
    LeadReportItem,
    OpportunityReportItem,
    PipelineReportResponse,
    PipelineStageSummary,
    UserActivityReportItem,
)
from app.utils.filters import apply_scope_filter


class ReportService:
    @staticmethod
    def get_customer_report(
        db: Session,
        current_user: User,
        status: Optional[str] = None,
    ) -> List[CustomerReportItem]:
        stmt = select(Customer).options(joinedload(Customer.creator))
        stmt = apply_scope_filter(stmt, Customer, current_user, owner_column_name="created_by")
        if status:
            stmt = stmt.where(Customer.status == status)

        customers = db.scalars(stmt.order_by(desc(Customer.created_at))).all()
        return [
            CustomerReportItem(
                id=c.id,
                customer_code=c.customer_code,
                customer_name=c.customer_name,
                email=c.email,
                phone=c.phone,
                company_name=c.company_name,
                status=c.status,
                created_by=c.creator.name if c.creator else "Unknown",
                created_at=c.created_at,
            )
            for c in customers
        ]

    @staticmethod
    def export_customers_csv(db: Session, current_user: User) -> str:
        report = ReportService.get_customer_report(db, current_user)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Customer Code", "Customer Name", "Email", "Phone", "Company", "Status", "Created By", "Created At"])
        for r in report:
            writer.writerow([r.id, r.customer_code, r.customer_name, r.email, r.phone, r.company_name or "", r.status, r.created_by, r.created_at.strftime("%Y-%m-%d %H:%M")])
        return output.getvalue()

    @staticmethod
    def get_lead_report(
        db: Session,
        current_user: User,
        status: Optional[str] = None,
    ) -> List[LeadReportItem]:
        stmt = select(Lead).options(joinedload(Lead.assigned_user))
        stmt = apply_scope_filter(stmt, Lead, current_user, owner_column_name="assigned_to")
        if status:
            stmt = stmt.where(Lead.status == status)

        leads = db.scalars(stmt.order_by(desc(Lead.created_at))).all()
        return [
            LeadReportItem(
                id=l.id,
                lead_code=l.lead_code,
                lead_name=l.lead_name,
                email=l.email,
                phone=l.phone,
                company_name=l.company_name,
                source=l.source,
                status=l.status,
                priority=l.priority,
                expected_value=l.expected_value,
                assigned_to=l.assigned_user.name if l.assigned_user else "Unknown",
                created_at=l.created_at,
                is_converted=(l.status == "Converted"),
            )
            for l in leads
        ]

    @staticmethod
    def export_leads_csv(db: Session, current_user: User) -> str:
        report = ReportService.get_lead_report(db, current_user)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Lead Code", "Lead Name", "Email", "Phone", "Company", "Source", "Status", "Priority", "Expected Value", "Assigned To", "Converted", "Created At"])
        for r in report:
            writer.writerow([r.id, r.lead_code, r.lead_name, r.email, r.phone, r.company_name or "", r.source, r.status, r.priority, r.expected_value, r.assigned_to, "Yes" if r.is_converted else "No", r.created_at.strftime("%Y-%m-%d %H:%M")])
        return output.getvalue()

    @staticmethod
    def get_follow_up_report(
        db: Session,
        current_user: User,
        status: Optional[str] = None,
    ) -> List[FollowUpReportItem]:
        stmt = select(FollowUp).options(
            joinedload(FollowUp.customer),
            joinedload(FollowUp.lead),
            joinedload(FollowUp.assigned_user),
        )
        stmt = apply_scope_filter(stmt, FollowUp, current_user, owner_column_name="assigned_to")
        if status:
            stmt = stmt.where(FollowUp.status == status)

        fus = db.scalars(stmt.order_by(desc(FollowUp.follow_up_date))).all()
        now = datetime.now()
        results = []
        for f in fus:
            related_str = "None"
            if f.customer:
                related_str = f"Customer: {f.customer.customer_name}"
            elif f.lead:
                related_str = f"Lead: {f.lead.lead_name}"
            is_overdue = (f.status == "Planned" and f.follow_up_date < now)
            results.append(
                FollowUpReportItem(
                    id=f.id,
                    subject=f.subject,
                    follow_up_type=f.follow_up_type,
                    follow_up_date=f.follow_up_date,
                    status=f.status,
                    related_to=related_str,
                    assigned_to=f.assigned_user.name if f.assigned_user else "Unknown",
                    is_overdue=is_overdue,
                )
            )
        return results

    @staticmethod
    def export_follow_ups_csv(db: Session, current_user: User) -> str:
        report = ReportService.get_follow_up_report(db, current_user)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Subject", "Type", "Follow-up Date", "Status", "Related To", "Assigned To", "Is Overdue"])
        for r in report:
            writer.writerow([r.id, r.subject, r.follow_up_type, r.follow_up_date.strftime("%Y-%m-%d %H:%M"), r.status, r.related_to, r.assigned_to, "Yes" if r.is_overdue else "No"])
        return output.getvalue()

    @staticmethod
    def get_opportunity_report(
        db: Session,
        current_user: User,
        stage: Optional[str] = None,
    ) -> List[OpportunityReportItem]:
        stmt = select(Opportunity).options(
            joinedload(Opportunity.customer),
            joinedload(Opportunity.assigned_user),
        )
        stmt = apply_scope_filter(stmt, Opportunity, current_user, owner_column_name="assigned_to")
        if stage:
            stmt = stmt.where(Opportunity.stage == stage)

        opps = db.scalars(stmt.order_by(desc(Opportunity.created_at))).all()
        return [
            OpportunityReportItem(
                id=o.id,
                opportunity_name=o.opportunity_name,
                customer_name=o.customer.customer_name if o.customer else "Unknown",
                stage=o.stage,
                amount=o.amount,
                probability=o.probability,
                weighted_value=o.weighted_value,
                expected_close_date=o.expected_close_date,
                status=o.status,
                assigned_to=o.assigned_user.name if o.assigned_user else "Unknown",
            )
            for o in opps
        ]

    @staticmethod
    def export_opportunities_csv(db: Session, current_user: User) -> str:
        report = ReportService.get_opportunity_report(db, current_user)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Opportunity Name", "Customer", "Stage", "Amount", "Probability (%)", "Weighted Value", "Close Date", "Status", "Assigned To"])
        for r in report:
            writer.writerow([r.id, r.opportunity_name, r.customer_name, r.stage, r.amount, r.probability, r.weighted_value, str(r.expected_close_date), r.status, r.assigned_to])
        return output.getvalue()

    @staticmethod
    def get_pipeline_report(db: Session, current_user: User) -> PipelineReportResponse:
        stmt = select(Opportunity)
        stmt = apply_scope_filter(stmt, Opportunity, current_user, owner_column_name="assigned_to")
        opps = db.scalars(stmt).all()

        stages = ["Qualification", "Proposal", "Negotiation", "Won", "Lost"]
        stage_summaries = []
        total_pipeline = 0.0
        total_weighted = 0.0

        for stage in stages:
            stage_opps = [o for o in opps if o.stage == stage]
            cnt = len(stage_opps)
            amt = sum(o.amount for o in stage_opps)
            w_amt = sum(o.weighted_value for o in stage_opps)
            stage_summaries.append(
                PipelineStageSummary(
                    stage=stage,
                    count=cnt,
                    total_amount=round(amt, 2),
                    weighted_amount=round(w_amt, 2),
                )
            )
            if stage not in ["Won", "Lost"]:
                total_pipeline += amt
                total_weighted += w_amt

        return PipelineReportResponse(
            stages=stage_summaries,
            total_pipeline_value=round(total_pipeline, 2),
            total_weighted_value=round(total_weighted, 2),
        )

    @staticmethod
    def get_conversion_report(db: Session, current_user: User) -> ConversionReportResponse:
        # Leads scope
        lead_query = select(Lead)
        lead_query = apply_scope_filter(lead_query, Lead, current_user, owner_column_name="assigned_to")
        leads = db.scalars(lead_query).all()
        total_leads = len(leads)
        converted_leads = sum(1 for l in leads if l.status == "Converted")
        conversion_rate = (converted_leads / total_leads * 100.0) if total_leads > 0 else 0.0

        # Opportunities scope
        opp_query = select(Opportunity)
        opp_query = apply_scope_filter(opp_query, Opportunity, current_user, owner_column_name="assigned_to")
        opps = db.scalars(opp_query).all()
        won_opps = [o for o in opps if o.stage == "Won"]

        return ConversionReportResponse(
            total_leads=total_leads,
            converted_leads=converted_leads,
            conversion_rate_percentage=round(conversion_rate, 2),
            total_opportunities_created=len(opps),
            won_opportunities_count=len(won_opps),
            total_won_value=round(sum(o.amount for o in won_opps), 2),
        )

    @staticmethod
    def get_user_activity_report(db: Session) -> List[UserActivityReportItem]:
        users = db.scalars(select(User).options(joinedload(User.role))).all()
        result = []
        for u in users:
            c_cnt = db.scalar(select(func.count(Customer.id)).where(Customer.created_by == u.id)) or 0
            l_cnt = db.scalar(select(func.count(Lead.id)).where(Lead.assigned_to == u.id)) or 0
            o_cnt = db.scalar(select(func.count(Opportunity.id)).where(Opportunity.assigned_to == u.id)) or 0
            f_cnt = db.scalar(select(func.count(FollowUp.id)).where(FollowUp.assigned_to == u.id, FollowUp.status == "Completed")) or 0
            a_cnt = db.scalar(select(func.count(Activity.id)).where(Activity.assigned_to == u.id)) or 0
            result.append(
                UserActivityReportItem(
                    user_id=u.id,
                    user_name=u.name,
                    role_name=u.role.name if u.role else "None",
                    customers_created=c_cnt,
                    leads_managed=l_cnt,
                    opportunities_managed=o_cnt,
                    follow_ups_completed=f_cnt,
                    activities_recorded=a_cnt,
                )
            )
        return result


report_service = ReportService()
