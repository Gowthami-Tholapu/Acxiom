import React, { useEffect, useState } from "react";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import ConfirmModal from "../../components/ConfirmModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import Pagination from "../../components/Pagination";
import { formatDateTime, getStatusBadgeClass } from "../../utils/formatters";
import ActivityFormModal from "./ActivityFormModal";

export default function ActivitiesListPage() {
  const [activities, setActivities] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [page, typeFilter, statusFilter]);

  async function fetchActivities(customSearch = search) {
    setLoading(true);
    setError(null);
    try {
      let url = `/activities?page=${page}&page_size=${pageSize}`;
      if (customSearch.trim()) url += `&search=${encodeURIComponent(customSearch.trim())}`;
      if (typeFilter) url += `&activity_type=${typeFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await api.get(url);
      setActivities(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setError(err.userMessage || "Failed to load activities.");
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchActivities(search);
  };

  const handleDeleteConfirm = async () => {
    if (!activityToDelete) return;
    setActionLoading(true);
    try {
      await api.delete(`/activities/${activityToDelete.id}`);
      setSuccessMsg(`Activity "${activityToDelete.subject}" deleted.`);
      setDeleteModalOpen(false);
      setActivityToDelete(null);
      fetchActivities();
    } catch (err) {
      setError(err.userMessage || "Failed to delete activity.");
      setDeleteModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">Sales Activity Log</h3>
          <p className="text-muted small mb-0">Record of all touchpoints: calls, meetings, emails, and client tasks.</p>
        </div>
        <button
          className="btn btn-primary-crm d-flex align-items-center"
          onClick={() => {
            setSelectedActivity(null);
            setFormModalOpen(true);
          }}
        >
          <i className="bi bi-plus-lg me-2"></i> Log Activity
        </button>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg("")} />}
      {error && <AlertBanner type="danger" message={error} onClose={() => setError(null)} />}

      {/* Filter and Search Bar */}
      <div className="card-crm p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search subject or descriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Activity Types</option>
              <option value="Call">Call</option>
              <option value="Meeting">Meeting</option>
              <option value="Email">Email</option>
              <option value="Task">Task</option>
            </select>
          </div>
          <div className="col-md-2">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Planned">Planned</option>
              <option value="Cancelled">Cancelled</option>
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
                setTypeFilter("");
                setStatusFilter("");
                setPage(1);
                fetchActivities("");
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
            <LoadingSpinner message="Fetching sales activities..." />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-list-task display-4 text-muted mb-3"></i>
            <h5 className="fw-semibold text-secondary">No Activities Recorded</h5>
            <p className="text-muted small">No activity logs match your filter criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-crm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Activity Date</th>
                  <th>Related To</th>
                  <th>Status</th>
                  <th>Assigned Rep</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="fw-bold text-dark">{a.subject}</div>
                      {a.description && (
                        <div className="small text-muted text-truncate" style={{ maxWidth: "240px" }}>
                          {a.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{a.activity_type}</span>
                    </td>
                    <td className="small text-secondary">{formatDateTime(a.activity_date)}</td>
                    <td className="small">
                      {a.customer_name ? (
                        <span className="text-primary fw-medium">Customer: {a.customer_name}</span>
                      ) : a.lead_name ? (
                        <span className="text-info fw-medium">Lead: {a.lead_name}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(a.status)}>{a.status}</span>
                    </td>
                    <td className="small text-muted">{a.assigned_user_name || "Sales Rep"}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          title="Edit Activity"
                          onClick={() => {
                            setSelectedActivity(a);
                            setFormModalOpen(true);
                          }}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          title="Delete Activity"
                          onClick={() => {
                            setActivityToDelete(a);
                            setDeleteModalOpen(true);
                          }}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
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

      <ActivityFormModal
        show={formModalOpen}
        activity={selectedActivity}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg(
            selectedActivity ? "Activity updated successfully!" : "New activity logged successfully!"
          );
          fetchActivities();
        }}
      />

      <ConfirmModal
        show={deleteModalOpen}
        title="Delete Activity Log"
        message={`Are you sure you want to delete activity "${activityToDelete?.subject}"?`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
