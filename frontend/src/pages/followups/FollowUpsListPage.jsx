import React, { useEffect, useState } from "react";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import ConfirmModal from "../../components/ConfirmModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import Pagination from "../../components/Pagination";
import { formatDateTime, getStatusBadgeClass } from "../../utils/formatters";
import FollowUpFormModal from "./FollowUpFormModal";

export default function FollowUpsListPage() {
  const [followUps, setFollowUps] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [timeFilter, setTimeFilter] = useState("all"); // "all", "upcoming", "overdue"
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fuToDelete, setFuToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchFollowUps();
  }, [page, timeFilter, statusFilter, typeFilter]);

  async function fetchFollowUps(customSearch = search) {
    setLoading(true);
    setError(null);
    try {
      let url = `/followups?page=${page}&page_size=${pageSize}`;
      if (customSearch.trim()) url += `&search=${encodeURIComponent(customSearch.trim())}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (typeFilter) url += `&follow_up_type=${typeFilter}`;
      if (timeFilter === "upcoming") url += `&upcoming=true`;
      if (timeFilter === "overdue") url += `&overdue=true`;

      const res = await api.get(url);
      setFollowUps(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setError(err.userMessage || "Failed to load follow-ups.");
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchFollowUps(search);
  };

  const handleQuickComplete = async (fu) => {
    try {
      await api.put(`/followups/${fu.id}`, { status: "Completed" });
      setSuccessMsg(`Follow-up "${fu.subject}" marked as Completed!`);
      fetchFollowUps();
    } catch (err) {
      setError(err.userMessage || "Failed to complete follow-up.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fuToDelete) return;
    setActionLoading(true);
    try {
      await api.delete(`/followups/${fuToDelete.id}`);
      setSuccessMsg(`Follow-up "${fuToDelete.subject}" deleted.`);
      setDeleteModalOpen(false);
      setFuToDelete(null);
      fetchFollowUps();
    } catch (err) {
      setError(err.userMessage || "Failed to delete follow-up.");
      setDeleteModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">Follow-Up Schedule</h3>
          <p className="text-muted small mb-0">Manage customer & lead reminders, meetings, calls, and tasks.</p>
        </div>
        <button
          className="btn btn-primary-crm d-flex align-items-center"
          onClick={() => {
            setSelectedFollowUp(null);
            setFormModalOpen(true);
          }}
        >
          <i className="bi bi-calendar-plus-fill me-2"></i> Schedule Follow-Up
        </button>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg("")} />}
      {error && <AlertBanner type="danger" message={error} onClose={() => setError(null)} />}

      {/* Filter and Search Bar */}
      <div className="card-crm p-3 mb-4">
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            className={`btn btn-sm ${timeFilter === "all" ? "btn-primary-crm" : "btn-light border"}`}
            onClick={() => {
              setTimeFilter("all");
              setPage(1);
            }}
          >
            All Follow-Ups
          </button>
          <button
            type="button"
            className={`btn btn-sm ${timeFilter === "upcoming" ? "btn-primary-crm" : "btn-light border"}`}
            onClick={() => {
              setTimeFilter("upcoming");
              setPage(1);
            }}
          >
            <i className="bi bi-clock-history me-1"></i> Upcoming Only
          </button>
          <button
            type="button"
            className={`btn btn-sm ${timeFilter === "overdue" ? "btn-danger text-white" : "btn-light border"}`}
            onClick={() => {
              setTimeFilter("overdue");
              setPage(1);
            }}
          >
            <i className="bi bi-exclamation-triangle-fill me-1"></i> Overdue Only
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search subject or remarks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="Planned">Planned</option>
              <option value="Completed">Completed</option>
              <option value="Missed">Missed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="col-md-2">
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              <option value="Call">Call</option>
              <option value="Meeting">Meeting</option>
              <option value="Email">Email</option>
              <option value="Task">Task</option>
            </select>
          </div>
          <div className="col-md-2 d-flex gap-2">
            <button type="submit" className="btn btn-dark flex-grow-1">
              Search
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setTypeFilter("");
                setTimeFilter("all");
                setPage(1);
                fetchFollowUps("");
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card-crm p-0 overflow-hidden">
        {loading ? (
          <div className="py-5">
            <LoadingSpinner message="Loading follow-up schedule..." />
          </div>
        ) : followUps.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-calendar-x display-4 text-muted mb-3"></i>
            <h5 className="fw-semibold text-secondary">No Follow-Ups Found</h5>
            <p className="text-muted small">No scheduled follow-up activities match your filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-crm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Scheduled Date & Time</th>
                  <th>Related To</th>
                  <th>Status</th>
                  <th>Assigned Rep</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((fu) => {
                  const isPast = new Date(fu.follow_up_date) < new Date() && fu.status === "Planned";
                  return (
                    <tr key={fu.id} className={isPast ? "table-danger table-opacity-10" : ""}>
                      <td>
                        <div className="fw-bold text-dark">{fu.subject}</div>
                        {fu.remarks && <div className="small text-muted text-truncate" style={{ maxWidth: "200px" }}>{fu.remarks}</div>}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{fu.follow_up_type}</span>
                      </td>
                      <td>
                        <div className={`small fw-semibold ${isPast ? "text-danger" : "text-dark"}`}>
                          {formatDateTime(fu.follow_up_date)}
                          {isPast && <span className="badge bg-danger ms-1">Overdue</span>}
                        </div>
                      </td>
                      <td className="small">
                        {fu.customer_name ? (
                          <span className="text-primary fw-medium">Customer: {fu.customer_name}</span>
                        ) : fu.lead_name ? (
                          <span className="text-info fw-medium">Lead: {fu.lead_name}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(fu.status)}>{fu.status}</span>
                      </td>
                      <td className="small text-muted">{fu.assigned_user_name || "Sales Rep"}</td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {fu.status === "Planned" && (
                            <button
                              className="btn btn-outline-success"
                              title="Mark Completed"
                              onClick={() => handleQuickComplete(fu)}
                            >
                              <i className="bi bi-check2"></i>
                            </button>
                          )}
                          <button
                            className="btn btn-outline-primary"
                            title="Edit / Reschedule"
                            onClick={() => {
                              setSelectedFollowUp(fu);
                              setFormModalOpen(true);
                            }}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            title="Delete Follow-Up"
                            onClick={() => {
                              setFuToDelete(fu);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      <FollowUpFormModal
        show={formModalOpen}
        followUp={selectedFollowUp}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg(
            selectedFollowUp ? "Follow-up updated successfully!" : "Follow-up scheduled successfully!"
          );
          fetchFollowUps();
        }}
      />

      <ConfirmModal
        show={deleteModalOpen}
        title="Delete Follow-Up"
        message={`Are you sure you want to delete follow-up "${fuToDelete?.subject}"?`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
