from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session, joinedload

from app.models.activity import Activity
from app.models.customer import Customer
from app.models.follow_up import FollowUp
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.user import User
from app.schemas.activity import ActivityResponse
from app.schemas.dashboard import ChartData, ChartDataset, DashboardKPIs, DashboardResponse
from app.schemas.follow_up import FollowUpResponse
from app.utils.filters import apply_scope_filter


class DashboardService:
    @staticmethod
    def get_dashboard_data(
        db: Session,
        current_user: User,
        date_filter: str = "all",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> DashboardResponse:
        now = datetime.now()
        date_from = None

        if date_filter == "today":
            date_from = datetime.combine(date.today(), datetime.min.time())
        elif date_filter == "this_week":
            start_week = date.today() - timedelta(days=date.today().weekday())
            date_from = datetime.combine(start_week, datetime.min.time())
        elif date_filter == "this_month":
            start_month = date(date.today().year, date.today().month, 1)
            date_from = datetime.combine(start_month, datetime.min.time())
        elif date_filter == "custom" and start_date:
            date_from = datetime.combine(start_date, datetime.min.time())

        # 1. Total Customers
        cust_query = select(func.count(Customer.id))
        cust_query = apply_scope_filter(cust_query, Customer, current_user, owner_column_name="created_by")
        if date_from:
            cust_query = cust_query.where(Customer.created_at >= date_from)
        total_customers = db.scalar(cust_query) or 0

        # 2. Leads (Total, Open, Status breakdown)
        lead_query = select(func.count(Lead.id))
        lead_query = apply_scope_filter(lead_query, Lead, current_user, owner_column_name="assigned_to")
        if date_from:
            lead_query = lead_query.where(Lead.created_at >= date_from)
        total_leads = db.scalar(lead_query) or 0

        open_lead_query = select(func.count(Lead.id)).where(
            Lead.status.notin_(["Converted", "Lost", "Unqualified"])
        )
        open_lead_query = apply_scope_filter(open_lead_query, Lead, current_user, owner_column_name="assigned_to")
        if date_from:
            open_lead_query = open_lead_query.where(Lead.created_at >= date_from)
        open_leads = db.scalar(open_lead_query) or 0

        # Lead status counts
        lead_statuses = ["New", "Contacted", "Qualified", "Lost", "Converted"]
        lead_status_counts = []
        for st in lead_statuses:
            q = select(func.count(Lead.id)).where(Lead.status == st)
            q = apply_scope_filter(q, Lead, current_user, owner_column_name="assigned_to")
            if date_from:
                q = q.where(Lead.created_at >= date_from)
            lead_status_counts.append(db.scalar(q) or 0)

        # 3. Opportunities
        opp_base = select(Opportunity)
        opp_base = apply_scope_filter(opp_base, Opportunity, current_user, owner_column_name="assigned_to")
        if date_from:
            opp_base = opp_base.where(Opportunity.created_at >= date_from)

        all_opps = db.scalars(opp_base).all()
        total_opportunities = len(all_opps)
        open_opportunities = sum(1 for o in all_opps if o.status == "Open")
        won_opportunities = sum(1 for o in all_opps if o.status == "Won")
        lost_opportunities = sum(1 for o in all_opps if o.status == "Lost")
        total_pipeline_val = sum(o.amount for o in all_opps if o.status == "Open")
        weighted_pipeline_val = sum(o.weighted_value for o in all_opps if o.status == "Open")

        # Opportunity Pipeline chart by stage
        stages = ["Qualification", "Proposal", "Negotiation", "Won", "Lost"]
        opp_stage_counts = []
        opp_stage_amounts = []
        for s in stages:
            stage_opps = [o for o in all_opps if o.stage == s]
            opp_stage_counts.append(len(stage_opps))
            opp_stage_amounts.append(sum(o.amount for o in stage_opps))

        # Monthly Sales Chart (last 6 months won revenue)
        monthly_labels = []
        monthly_won_amounts = []
        curr_date = date.today()
        for i in range(5, -1, -1):
            m_year = curr_date.year
            m_month = curr_date.month - i
            while m_month <= 0:
                m_month += 12
                m_year -= 1
            month_label = date(m_year, m_month, 1).strftime("%b %Y")
            monthly_labels.append(month_label)

            # Sum won opportunities in that month
            m_start = datetime(m_year, m_month, 1)
            next_m = m_month + 1
            next_y = m_year
            if next_m > 12:
                next_m = 1
                next_y += 1
            m_end = datetime(next_y, next_m, 1)

            q_won = select(func.sum(Opportunity.amount)).where(
                Opportunity.status == "Won",
                Opportunity.created_at >= m_start,
                Opportunity.created_at < m_end,
            )
            q_won = apply_scope_filter(q_won, Opportunity, current_user, owner_column_name="assigned_to")
            m_won_sum = db.scalar(q_won) or 0.0
            monthly_won_amounts.append(float(m_won_sum))

        # Recent activities (last 5)
        act_stmt = (
            select(Activity)
            .options(
                joinedload(Activity.customer),
                joinedload(Activity.lead),
                joinedload(Activity.assigned_user),
            )
            .order_by(Activity.activity_date.desc())
            .limit(5)
        )
        act_stmt = apply_scope_filter(act_stmt, Activity, current_user, owner_column_name="assigned_to")
        recent_acts_db = db.scalars(act_stmt).all()
        recent_activities = [
            ActivityResponse(
                id=a.id,
                activity_type=a.activity_type,
                subject=a.subject,
                description=a.description,
                activity_date=a.activity_date,
                customer_id=a.customer_id,
                customer_name=a.customer.customer_name if a.customer else None,
                lead_id=a.lead_id,
                lead_name=a.lead.lead_name if a.lead else None,
                assigned_to=a.assigned_to,
                assigned_user_name=a.assigned_user.name if a.assigned_user else None,
                status=a.status,
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
            for a in recent_acts_db
        ]

        # Upcoming follow-ups (next 5)
        fu_stmt = (
            select(FollowUp)
            .options(
                joinedload(FollowUp.customer),
                joinedload(FollowUp.lead),
                joinedload(FollowUp.opportunity),
                joinedload(FollowUp.assigned_user),
            )
            .where(FollowUp.status == "Planned", FollowUp.follow_up_date >= now)
            .order_by(FollowUp.follow_up_date.asc())
            .limit(5)
        )
        fu_stmt = apply_scope_filter(fu_stmt, FollowUp, current_user, owner_column_name="assigned_to")
        upcoming_fu_db = db.scalars(fu_stmt).all()
        upcoming_follow_ups = [
            FollowUpResponse(
                id=f.id,
                customer_id=f.customer_id,
                customer_name=f.customer.customer_name if f.customer else None,
                lead_id=f.lead_id,
                lead_name=f.lead.lead_name if f.lead else None,
                opportunity_id=f.opportunity_id,
                opportunity_name=f.opportunity.opportunity_name if f.opportunity else None,
                follow_up_date=f.follow_up_date,
                follow_up_type=f.follow_up_type,
                subject=f.subject,
                remarks=f.remarks,
                status=f.status,
                assigned_to=f.assigned_to,
                assigned_user_name=f.assigned_user.name if f.assigned_user else None,
                created_at=f.created_at,
                updated_at=f.updated_at,
            )
            for f in upcoming_fu_db
        ]

        return DashboardResponse(
            kpis=DashboardKPIs(
                total_customers=total_customers,
                total_leads=total_leads,
                open_leads=open_leads,
                total_opportunities=total_opportunities,
                open_opportunities=open_opportunities,
                won_opportunities=won_opportunities,
                lost_opportunities=lost_opportunities,
                total_pipeline_value=round(total_pipeline_val, 2),
                weighted_pipeline_value=round(weighted_pipeline_val, 2),
            ),
            lead_status_chart=ChartData(
                labels=lead_statuses,
                datasets=[
                    ChartDataset(
                        label="Leads by Status",
                        data=[float(c) for c in lead_status_counts],
                        backgroundColor=["#3b82f6", "#06b6d4", "#10b981", "#ef4444", "#8b5cf6"],
                    )
                ],
            ),
            opportunity_pipeline_chart=ChartData(
                labels=stages,
                datasets=[
                    ChartDataset(
                        label="Pipeline Amount ($)",
                        data=[round(a, 2) for a in opp_stage_amounts],
                        backgroundColor=["#6366f1", "#3b82f6", "#f59e0b", "#10b981", "#ef4444"],
                    )
                ],
            ),
            monthly_sales_chart=ChartData(
                labels=monthly_labels,
                datasets=[
                    ChartDataset(
                        label="Won Revenue ($)",
                        data=monthly_won_amounts,
                        borderColor="#10b981",
                        backgroundColor="rgba(16, 185, 129, 0.15)",
                    )
                ],
            ),
            recent_activities=recent_activities,
            upcoming_follow_ups=upcoming_follow_ups,
        )


dashboard_service = DashboardService()
