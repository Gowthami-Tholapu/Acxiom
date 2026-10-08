import React, { useEffect, useState } from "react";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/formatters";

export default function ReportsPage() {
  const { user, isAdmin, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState("pipeline");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReport(activeTab);
  }, [activeTab]);

  async function loadReport(tab) {
    setLoading(true);
    setError(null);
    try {
      let endpoint = `/reports/${tab}`;
      const res = await api.get(endpoint);
      setReportData(res.data);
    } catch (err) {
      setError(err.userMessage || "Failed to load report data.");
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadCsv = (reportName) => {
    const token = localStorage.getItem("acxiom_token");
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
    // Trigger download via direct authenticated request or window.open with token query
    fetch(`${baseUrl}/reports/${reportName}/csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportName}_report.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => {
        setError("Failed to download CSV report: " + err.message);
      });
  };

  return (
    <div>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">CRM Reports & Analytics</h3>
          <p className="text-muted small mb-0">Role-scoped executive reporting, conversion analytics, and CSV exports.</p>
        </div>
        {["customers", "leads", "followups", "opportunities"].includes(activeTab) && (
          <button className="btn btn-outline-success d-flex align-items-center" onClick={() => handleDownloadCsv(activeTab)}>
            <i className="bi bi-file-earmark-excel-fill me-2"></i> Export to CSV
          </button>
        )}
      </div>

      {error && <AlertBanner type="danger" message={error} onClose={() => setError(null)} />}

      {/* Tabs navigation */}
      <ul className="nav nav-pills mb-4 bg-white p-2 rounded-3 border shadow-sm">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "pipeline" ? "active" : ""}`}
            onClick={() => setActiveTab("pipeline")}
          >
            Pipeline Report
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "conversions" ? "active" : ""}`}
            onClick={() => setActiveTab("conversions")}
          >
            Conversion Report
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "opportunities" ? "active" : ""}`}
            onClick={() => setActiveTab("opportunities")}
          >
            Opportunities
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "customers" ? "active" : ""}`}
            onClick={() => setActiveTab("customers")}
          >
            Customers
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "leads" ? "active" : ""}`}
            onClick={() => setActiveTab("leads")}
          >
            Leads
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "followups" ? "active" : ""}`}
            onClick={() => setActiveTab("followups")}
          >
            Follow-Ups
          </button>
        </li>

        {(isAdmin || isManager) && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "user-activity" ? "active" : ""}`}
              onClick={() => setActiveTab("user-activity")}
            >
              User Activity
            </button>
          </li>
        )}

        {isAdmin && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "audit" ? "active" : ""}`}
              onClick={() => setActiveTab("audit")}
            >
              Audit Log Report
            </button>
          </li>
        )}
      </ul>

      {/* Report Content */}
      <div className="card-crm p-4">
        {loading ? (
          <LoadingSpinner message="Generating report..." />
        ) : !reportData ? (
          <p className="text-muted text-center py-4">No report data returned.</p>
        ) : (
          <>
            {/* Pipeline Report */}
            {activeTab === "pipeline" && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0">Stage-Wise Sales Pipeline Breakdown</h5>
                  <div className="text-end">
                    <span className="small text-muted me-3">
                      Total Active Pipeline: <strong>{formatCurrency(reportData.total_pipeline_value)}</strong>
                    </span>
                    <span className="small text-muted">
                      Weighted Pipeline: <strong>{formatCurrency(reportData.total_weighted_value)}</strong>
                    </span>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-crm table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Pipeline Stage</th>
                        <th>Deals Count</th>
                        <th>Total Amount</th>
                        <th>Weighted Value</th>
                        <th>% of Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.stages?.map((s) => {
                        const pct =
                          reportData.total_pipeline_value > 0
                            ? ((s.total_amount / reportData.total_pipeline_value) * 100).toFixed(1)
                            : 0;
                        return (
                          <tr key={s.stage}>
                            <td className="fw-bold">{s.stage}</td>
                            <td>
                              <span className="badge bg-light text-dark border">{s.count} deals</span>
                            </td>
                            <td className="fw-bold text-dark">{formatCurrency(s.total_amount)}</td>
                            <td className="fw-bold text-success">{formatCurrency(s.weighted_amount)}</td>
                            <td>{s.stage === "Won" || s.stage === "Lost" ? "-" : `${pct}%`}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Conversion Report */}
            {activeTab === "conversions" && (
              <div>
                <h5 className="fw-bold mb-4">Lead-to-Customer & Deal Conversion Metrics</h5>
                <div className="row g-4 mb-4">
                  <div className="col-sm-6 col-lg-4">
                    <div className="card-crm p-4 text-center border-top border-4 border-primary">
                      <div className="text-muted small text-uppercase fw-semibold mb-1">Conversion Rate</div>
                      <div className="display-5 fw-bold text-primary mb-2">
                        {reportData.conversion_rate_percentage}%
                      </div>
                      <div className="small text-muted">
                        {reportData.converted_leads} converted out of {reportData.total_leads} leads
                      </div>
                    </div>
                  </div>
                  <div className="col-sm-6 col-lg-4">
                    <div className="card-crm p-4 text-center border-top border-4 border-success">
                      <div className="text-muted small text-uppercase fw-semibold mb-1">Closed Deals Won</div>
                      <div className="display-5 fw-bold text-success mb-2">
                        {reportData.won_opportunities_count}
                      </div>
                      <div className="small text-muted">
                        Total Deals Evaluated: {reportData.total_opportunities_created}
                      </div>
                    </div>
                  </div>
                  <div className="col-sm-6 col-lg-4">
                    <div className="card-crm p-4 text-center border-top border-4 border-warning">
                      <div className="text-muted small text-uppercase fw-semibold mb-1">Total Won Revenue</div>
                      <div className="display-5 fw-bold text-dark mb-2">
                        {formatCurrency(reportData.total_won_value)}
                      </div>
                      <div className="small text-muted">Verified Commercial Revenue</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Report */}
            {activeTab === "customers" && Array.isArray(reportData) && (
              <div className="table-responsive">
                <table className="table table-crm table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Customer Code</th>
                      <th>Customer Name</th>
                      <th>Company</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Created By</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((c) => (
                      <tr key={c.id}>
                        <td><span className="badge bg-light text-primary border">{c.customer_code}</span></td>
                        <td className="fw-bold">{c.customer_name}</td>
                        <td>{c.company_name || "-"}</td>
                        <td>{c.email}</td>
                        <td>{c.phone}</td>
                        <td><span className="badge bg-success">{c.status}</span></td>
                        <td>{c.created_by}</td>
                        <td className="small text-muted">{formatDate(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Lead Report */}
            {activeTab === "leads" && Array.isArray(reportData) && (
              <div className="table-responsive">
                <table className="table table-crm table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Lead Code</th>
                      <th>Lead Name</th>
                      <th>Company</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Est. Value</th>
                      <th>Converted?</th>
                      <th>Assigned To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((l) => (
                      <tr key={l.id}>
                        <td><span className="badge bg-light text-primary border">{l.lead_code}</span></td>
                        <td className="fw-bold">{l.lead_name}</td>
                        <td>{l.company_name || "-"}</td>
                        <td><span className="badge bg-light text-dark border">{l.source}</span></td>
                        <td><span className="badge bg-secondary">{l.status}</span></td>
                        <td>{l.priority}</td>
                        <td className="fw-bold">{formatCurrency(l.expected_value)}</td>
                        <td>
                          {l.is_converted ? (
                            <span className="badge bg-success">Yes</span>
                          ) : (
                            <span className="badge bg-light text-muted border">No</span>
                          )}
                        </td>
                        <td>{l.assigned_to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Follow-up Report */}
            {activeTab === "followups" && Array.isArray(reportData) && (
              <div className="table-responsive">
                <table className="table table-crm table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Type</th>
                      <th>Scheduled Date</th>
                      <th>Related To</th>
                      <th>Status</th>
                      <th>Assigned Rep</th>
                      <th>Overdue?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((f) => (
                      <tr key={f.id}>
                        <td className="fw-bold">{f.subject}</td>
                        <td><span className="badge bg-light text-dark border">{f.follow_up_type}</span></td>
                        <td>{formatDateTime(f.follow_up_date)}</td>
                        <td>{f.related_to}</td>
                        <td><span className="badge bg-secondary">{f.status}</span></td>
                        <td>{f.assigned_to}</td>
                        <td>{f.is_overdue ? <span className="badge bg-danger">Overdue</span> : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Opportunities Report */}
            {activeTab === "opportunities" && Array.isArray(reportData) && (
              <div className="table-responsive">
                <table className="table table-crm table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Opportunity Name</th>
                      <th>Customer</th>
                      <th>Stage</th>
                      <th>Amount</th>
                      <th>Prob.</th>
                      <th>Weighted Value</th>
                      <th>Expected Close</th>
                      <th>Status</th>
                      <th>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((o) => (
                      <tr key={o.id}>
                        <td className="fw-bold">{o.opportunity_name}</td>
                        <td>{o.customer_name}</td>
                        <td><span className="badge bg-primary bg-opacity-75">{o.stage}</span></td>
                        <td className="fw-bold">{formatCurrency(o.amount)}</td>
                        <td>{o.probability}%</td>
                        <td className="fw-bold text-success">{formatCurrency(o.weighted_value)}</td>
                        <td>{formatDate(o.expected_close_date)}</td>
                        <td><span className="badge bg-secondary">{o.status}</span></td>
                        <td>{o.assigned_to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* User Activity Report */}
            {activeTab === "user-activity" && Array.isArray(reportData) && (
              <div className="table-responsive">
                <table className="table table-crm table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>User Name</th>
                      <th>Role</th>
                      <th>Customers Created</th>
                      <th>Leads Managed</th>
                      <th>Deals Managed</th>
                      <th>Follow-Ups Completed</th>
                      <th>Touchpoints Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((u) => (
                      <tr key={u.user_id}>
                        <td className="fw-bold">{u.user_name}</td>
                        <td><span className="badge bg-primary">{u.role_name}</span></td>
                        <td className="fw-bold">{u.customers_created}</td>
                        <td className="fw-bold">{u.leads_managed}</td>
                        <td className="fw-bold">{u.opportunities_managed}</td>
                        <td className="fw-bold text-success">{u.follow_ups_completed}</td>
                        <td className="fw-bold text-info">{u.activities_recorded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Audit Log Report */}
            {activeTab === "audit" && Array.isArray(reportData) && (
              <div className="table-responsive">
                <table className="table table-crm table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Record ID</th>
                      <th>IP Address</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((a) => (
                      <tr key={a.id}>
                        <td className="small text-muted">{formatDateTime(a.created_at)}</td>
                        <td className="fw-medium">{a.user_name || "System"}</td>
                        <td><span className="badge bg-dark">{a.action}</span></td>
                        <td><span className="badge bg-light text-dark border">{a.entity_name}</span></td>
                        <td>{a.record_id || "-"}</td>
                        <td className="small text-muted">{a.ip_address || "127.0.0.1"}</td>
                        <td className="small">{a.details || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
