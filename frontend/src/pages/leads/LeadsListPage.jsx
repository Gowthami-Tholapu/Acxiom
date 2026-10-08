import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import ConfirmModal from "../../components/ConfirmModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import Pagination from "../../components/Pagination";
import { formatCurrency, formatDate, getStatusBadgeClass } from "../../utils/formatters";
import LeadConvertModal from "./LeadConvertModal";
import LeadFormModal from "./LeadFormModal";

export default function LeadsListPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [page, statusFilter, priorityFilter]);

  async function fetchLeads(customSearch = search) {
    setLoading(true);
    setError(null);
    try {
      let url = `/leads?page=${page}&page_size=${pageSize}`;
      if (customSearch.trim()) url += `&search=${encodeURIComponent(customSearch.trim())}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (priorityFilter) url += `&priority=${priorityFilter}`;

      const res = await api.get(url);
      setLeads(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setError(err.userMessage || "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLeads(search);
  };

  const handleOpenCreate = () => {
    setSelectedLead(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (lead) => {
    setSelectedLead(lead);
    setFormModalOpen(true);
  };

  const handleOpenConvert = (lead) => {
    setLeadToConvert(lead);
    setConvertModalOpen(true);
  };

  const handleOpenDelete = (lead) => {
    setLeadToDelete(lead);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;
    setActionLoading(true);
    try {
      await api.delete(`/leads/${leadToDelete.id}`);
      setSuccessMsg(`Lead "${leadToDelete.lead_name}" deleted.`);
      setDeleteModalOpen(false);
      setLeadToDelete(null);
      fetchLeads();
    } catch (err) {
      setError(err.userMessage || "Failed to delete lead.");
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
          <h3 className="fw-bold text-dark mb-1">Lead Management</h3>
          <p className="text-muted small mb-0">Capture, qualify, and convert prospect leads.</p>
        </div>
        <button className="btn btn-primary-crm d-flex align-items-center" onClick={handleOpenCreate}>
          <i className="bi bi-funnel me-2"></i> Add Lead
        </button>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg("")} />}
      {error && <AlertBanner type="danger" message={error} onClose={() => setError(null)} />}

      {/* Filter and Search Bar */}
      <div className="card-crm p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search lead name, company, email..."
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
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Unqualified">Unqualified</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
          <div className="col-md-2">
            <select
              className="form-select"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
          <div className="col-md-3 d-flex gap-2">
            <button type="submit" className="btn btn-dark flex-grow-1">
              Filter
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setPriorityFilter("");
                setPage(1);
                fetchLeads("");
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Leads Table */}
      <div className="card-crm p-0 overflow-hidden">
        {loading ? (
          <div className="py-5">
            <LoadingSpinner message="Loading prospective leads..." />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-funnel display-4 text-muted mb-3"></i>
            <h5 className="fw-semibold text-secondary">No Leads Found</h5>
            <p className="text-muted small">No records match your search or filter settings.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-crm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Lead Name</th>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Est. Value</th>
                  <th>Assigned Rep</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <span className="badge bg-light text-primary border fw-bold">{l.lead_code}</span>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{l.lead_name}</div>
                      <div className="small text-muted">{l.email}</div>
                    </td>
                    <td className="text-secondary">{l.company_name || "-"}</td>
                    <td>
                      <span className="badge bg-light text-dark border">{l.source}</span>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(l.status)}>{l.status}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          l.priority === "Urgent"
                            ? "bg-danger"
                            : l.priority === "High"
                            ? "bg-warning text-dark"
                            : "bg-secondary"
                        }`}
                      >
                        {l.priority}
                      </span>
                    </td>
                    <td className="fw-bold text-dark">{formatCurrency(l.expected_value)}</td>
                    <td className="small text-muted">{l.assigned_user_name || "Sales Rep"}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        {l.status !== "Converted" && (
                          <button
                            className="btn btn-outline-success"
                            title="Convert to Customer"
                            onClick={() => handleOpenConvert(l)}
                          >
                            <i className="bi bi-arrow-repeat me-1"></i> Convert
                          </button>
                        )}
                        <button
                          className="btn btn-outline-primary"
                          title="Edit Lead"
                          onClick={() => handleOpenEdit(l)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          title="Delete Lead"
                          onClick={() => handleOpenDelete(l)}
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

      {/* Form Modal */}
      <LeadFormModal
        show={formModalOpen}
        lead={selectedLead}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg(selectedLead ? "Lead updated successfully!" : "New lead captured successfully!");
          fetchLeads();
        }}
      />

      {/* Convert Modal */}
      <LeadConvertModal
        show={convertModalOpen}
        lead={leadToConvert}
        onClose={() => setConvertModalOpen(false)}
        onSuccess={(result) => {
          setSuccessMsg(result.message || "Lead successfully converted to Customer!");
          fetchLeads();
        }}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        show={deleteModalOpen}
        title="Delete Lead"
        message={`Are you sure you want to permanently delete lead "${leadToDelete?.lead_name}"?`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
