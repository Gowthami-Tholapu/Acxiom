import React, { useEffect, useState } from "react";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import LoadingSpinner from "../../components/LoadingSpinner";
import Pagination from "../../components/Pagination";
import { formatDateTime } from "../../utils/formatters";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [inspectLog, setInspectLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter, actionFilter]);

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    try {
      let url = `/audit-logs?page=${page}&page_size=${pageSize}`;
      if (entityFilter) url += `&entity_name=${entityFilter}`;
      if (actionFilter) url += `&action=${actionFilter}`;

      const res = await api.get(url);
      setLogs(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setError(err.userMessage || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  const getActionBadgeClass = (action) => {
    switch (action?.toUpperCase()) {
      case "CREATE":
        return "bg-success";
      case "UPDATE":
      case "RESCHEDULE":
        return "bg-primary";
      case "DELETE":
        return "bg-danger";
      case "CONVERT":
        return "bg-purple text-white";
      case "LOGIN":
        return "bg-info text-dark";
      case "LOGIN_FAILED":
      case "LOCKOUT":
        return "bg-danger";
      case "PASSWORD_RESET":
      case "ROLE_CHANGE":
        return "bg-warning text-dark";
      default:
        return "bg-secondary";
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">System Audit Trail</h3>
          <p className="text-muted small mb-0">Immutable, append-oriented log of all security, data, and lifecycle operations.</p>
        </div>
      </div>

      {error && <AlertBanner type="danger" message={error} onClose={() => setError(null)} />}

      {/* Filter Bar */}
      <div className="card-crm p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-md-4">
            <select
              className="form-select"
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Modules / Entities</option>
              <option value="Customer">Customer</option>
              <option value="Lead">Lead</option>
              <option value="Opportunity">Opportunity</option>
              <option value="FollowUp">Follow-Up</option>
              <option value="Activity">Activity</option>
              <option value="User">User</option>
              <option value="Auth">Auth & Security</option>
            </select>
          </div>
          <div className="col-md-4">
            <select
              className="form-select"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="LOCKOUT">LOCKOUT</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="CONVERT">CONVERT</option>
              <option value="PASSWORD_RESET">PASSWORD_RESET</option>
              <option value="ROLE_CHANGE">ROLE_CHANGE</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE</option>
            </select>
          </div>
          <div className="col-md-4">
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={() => {
                setEntityFilter("");
                setActionFilter("");
                setPage(1);
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card-crm p-0 overflow-hidden">
        {loading ? (
          <div className="py-5">
            <LoadingSpinner message="Querying audit records..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-5 text-muted small">No audit log records found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-crm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User / Actor</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Record ID</th>
                  <th>IP Address</th>
                  <th>Summary / Details</th>
                  <th className="text-end">Changes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="small text-muted font-monospace">{formatDateTime(log.created_at)}</td>
                    <td>
                      <span className="fw-semibold text-dark">{log.user_name || "Anonymous / System"}</span>
                    </td>
                    <td>
                      <span className={`badge ${getActionBadgeClass(log.action)}`}>{log.action}</span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{log.entity_name}</span>
                    </td>
                    <td className="small font-monospace">{log.record_id || "-"}</td>
                    <td className="small text-muted">{log.ip_address || "127.0.0.1"}</td>
                    <td className="small text-dark text-truncate" style={{ maxWidth: "260px" }}>
                      {log.details || "-"}
                    </td>
                    <td className="text-end">
                      {(log.old_value || log.new_value) && (
                        <button
                          className="btn btn-outline-secondary btn-sm py-0 px-2"
                          style={{ fontSize: "0.75rem" }}
                          onClick={() => setInspectLog(log)}
                        >
                          View Diff
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-3 pb-3">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      </div>

      {/* Diff Inspector Modal */}
      {inspectLog && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow border-0" style={{ borderRadius: "12px" }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  Audit Entry #{inspectLog.id} &bull; {inspectLog.action} on {inspectLog.entity_name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setInspectLog(null)}></button>
              </div>
              <div className="modal-body py-3">
                <p className="text-muted small mb-3">{inspectLog.details}</p>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label text-danger">Previous State (Old Value)</label>
                    <pre
                      className="p-3 bg-light border rounded small overflow-auto text-dark"
                      style={{ maxHeight: "250px" }}
                    >
                      {inspectLog.old_value ? JSON.stringify(JSON.parse(inspectLog.old_value), null, 2) : "None"}
                    </pre>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-success">Updated State (New Value)</label>
                    <pre
                      className="p-3 bg-light border rounded small overflow-auto text-dark"
                      style={{ maxHeight: "250px" }}
                    >
                      {inspectLog.new_value ? JSON.stringify(JSON.parse(inspectLog.new_value), null, 2) : "None"}
                    </pre>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-secondary" onClick={() => setInspectLog(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
