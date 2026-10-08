import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatsCard from "../../components/StatsCard";
import LeadStatusChart from "../../charts/LeadStatusChart";
import MonthlySalesChart from "../../charts/MonthlySalesChart";
import PipelineChart from "../../charts/PipelineChart";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDateTime, getStatusBadgeClass } from "../../utils/formatters";

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    fetchDashboard(dateFilter);
  }, [dateFilter]);

  async function fetchDashboard(filter) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/dashboard?date_filter=${filter}`);
      setData(res.data);
    } catch (err) {
      setError(err.userMessage || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }

  const kpis = data?.kpis;

  return (
    <div>
      {/* Header and Filter Controls */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            Sales Dashboard
          </h3>
          <p className="text-muted small mb-0">
            Welcome back, <strong>{user?.name}</strong>. Scope:{" "}
            <span className="badge bg-secondary">{user?.role?.name} Scope</span>
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="btn-group shadow-sm bg-white p-1 rounded-3 border" role="group">
          {[
            { label: "All Time", value: "all" },
            { label: "Today", value: "today" },
            { label: "This Week", value: "this_week" },
            { label: "This Month", value: "this_month" },
          ].map((btn) => (
            <button
              key={btn.value}
              type="button"
              className={`btn btn-sm ${dateFilter === btn.value ? "btn-primary-crm" : "btn-light"}`}
              onClick={() => setDateFilter(btn.value)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {error && <AlertBanner type="danger" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <LoadingSpinner message="Calculating pipeline metrics and charts..." />
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-lg-3">
              <StatsCard
                title="Total Customers"
                value={kpis?.total_customers ?? 0}
                icon="bi-building"
                color="primary"
                subtitle="Active & verified accounts"
              />
            </div>
            <div className="col-sm-6 col-lg-3">
              <StatsCard
                title="Total Leads"
                value={kpis?.total_leads ?? 0}
                icon="bi-funnel-fill"
                color="info"
                subtitle={`${kpis?.open_leads ?? 0} actively in progress`}
              />
            </div>
            <div className="col-sm-6 col-lg-3">
              <StatsCard
                title="Open Deals"
                value={kpis?.open_opportunities ?? 0}
                icon="bi-briefcase-fill"
                color="warning"
                subtitle={`Out of ${kpis?.total_opportunities ?? 0} total deals`}
              />
            </div>
            <div className="col-sm-6 col-lg-3">
              <StatsCard
                title="Pipeline Value"
                value={formatCurrency(kpis?.total_pipeline_value ?? 0)}
                icon="bi-cash-coin"
                color="success"
                subtitle={`Weighted: ${formatCurrency(kpis?.weighted_pipeline_value ?? 0)}`}
              />
            </div>
          </div>

          {/* Secondary Outcome Stats */}
          <div className="row g-3 mb-4">
            <div className="col-sm-4">
              <div className="card-crm p-3 border-start border-4 border-success">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small fw-semibold text-uppercase">Deals Won</div>
                    <div className="fs-4 fw-bold text-success">{kpis?.won_opportunities ?? 0}</div>
                  </div>
                  <i className="bi bi-trophy-fill text-success fs-3"></i>
                </div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="card-crm p-3 border-start border-4 border-danger">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small fw-semibold text-uppercase">Deals Lost</div>
                    <div className="fs-4 fw-bold text-danger">{kpis?.lost_opportunities ?? 0}</div>
                  </div>
                  <i className="bi bi-x-circle-fill text-danger fs-3"></i>
                </div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="card-crm p-3 border-start border-4 border-primary">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small fw-semibold text-uppercase">Weighted Pipeline</div>
                    <div className="fs-4 fw-bold text-primary">{formatCurrency(kpis?.weighted_pipeline_value ?? 0)}</div>
                  </div>
                  <i className="bi bi-pie-chart-fill text-primary fs-3"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row g-4 mb-4">
            <div className="col-lg-4">
              <div className="card-crm p-3 h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0 text-dark">Lead Status Breakdown</h6>
                  <span className="badge bg-light text-muted border">Real-time</span>
                </div>
                <LeadStatusChart chartData={data?.lead_status_chart} />
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card-crm p-3 h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0 text-dark">Opportunity Pipeline</h6>
                  <span className="badge bg-light text-muted border">By Stage</span>
                </div>
                <PipelineChart chartData={data?.opportunity_pipeline_chart} />
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card-crm p-3 h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0 text-dark">Monthly Won Revenue</h6>
                  <span className="badge bg-light text-muted border">Last 6 Months</span>
                </div>
                <MonthlySalesChart chartData={data?.monthly_sales_chart} />
              </div>
            </div>
          </div>

          {/* Dashboard Summary Tables Row */}
          <div className="row g-4">
            {/* Upcoming Follow-ups */}
            <div className="col-lg-6">
              <div className="card-crm p-3 h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0 text-dark">
                    <i className="bi bi-calendar-event text-primary me-2"></i>Upcoming Follow-Ups
                  </h6>
                  <Link to="/followups" className="small text-primary fw-semibold text-decoration-none">
                    View All &rarr;
                  </Link>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Subject</th>
                        <th>Type</th>
                        <th>Scheduled For</th>
                        <th>Assigned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.upcoming_follow_ups?.length > 0 ? (
                        data.upcoming_follow_ups.map((fu) => (
                          <tr key={fu.id}>
                            <td className="fw-semibold text-truncate" style={{ maxWidth: "160px" }}>
                              {fu.subject}
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border">{fu.follow_up_type}</span>
                            </td>
                            <td className="small text-muted">{formatDateTime(fu.follow_up_date)}</td>
                            <td className="small">{fu.assigned_user_name || "Assigned"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-3 text-muted small">
                            No upcoming follow-ups scheduled.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="col-lg-6">
              <div className="card-crm p-3 h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0 text-dark">
                    <i className="bi bi-activity text-info me-2"></i>Recent Sales Activities
                  </h6>
                  <Link to="/activities" className="small text-primary fw-semibold text-decoration-none">
                    View All &rarr;
                  </Link>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Activity</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.recent_activities?.length > 0 ? (
                        data.recent_activities.map((act) => (
                          <tr key={act.id}>
                            <td className="fw-semibold text-truncate" style={{ maxWidth: "160px" }}>
                              {act.subject}
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border">{act.activity_type}</span>
                            </td>
                            <td className="small text-muted">{formatDateTime(act.activity_date)}</td>
                            <td>
                              <span className={getStatusBadgeClass(act.status)}>{act.status}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-3 text-muted small">
                            No recent activity recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
