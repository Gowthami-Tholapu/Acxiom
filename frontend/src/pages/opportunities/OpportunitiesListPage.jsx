import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import ConfirmModal from "../../components/ConfirmModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import Pagination from "../../components/Pagination";
import { formatCurrency, formatDate, getStatusBadgeClass } from "../../utils/formatters";
import OpportunityFormModal from "./OpportunityFormModal";

export default function OpportunitiesListPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [oppToDelete, setOppToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOpportunities();
  }, [page, stageFilter, statusFilter]);

  async function fetchOpportunities(customSearch = search) {
    setLoading(true);
    setError(null);
    try {
      let url = `/opportunities?page=${page}&page_size=${pageSize}`;
      if (customSearch.trim()) url += `&search=${encodeURIComponent(customSearch.trim())}`;
      if (stageFilter) url += `&stage=${stageFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await api.get(url);
      setOpportunities(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setError(err.userMessage || "Failed to load opportunities.");
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOpportunities(search);
  };

  const handleOpenCreate = () => {
    setSelectedOpp(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (opp) => {
    setSelectedOpp(opp);
    setFormModalOpen(true);
  };

  const handleOpenDelete = (opp) => {
    setOppToDelete(opp);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!oppToDelete) return;
    setActionLoading(true);
    try {
      await api.delete(`/opportunities/${oppToDelete.id}`);
      setSuccessMsg(`Deal "${oppToDelete.opportunity_name}" deleted.`);
      setDeleteModalOpen(false);
      setOppToDelete(null);
      fetchOpportunities();
    } catch (err) {
      setError(err.userMessage || "Failed to delete opportunity.");
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
          <h3 className="fw-bold text-dark mb-1">Opportunities & Deals</h3>
          <p className="text-muted small mb-0">Track commercial deals, stages, values, and probabilities.</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/opportunities/pipeline" className="btn btn-outline-primary d-flex align-items-center">
            <i className="bi bi-kanban-fill me-2"></i> Pipeline Board
          </Link>
          <button className="btn btn-primary-crm d-flex align-items-center" onClick={handleOpenCreate}>
            <i className="bi bi-plus-circle-fill me-2"></i> New Deal
          </button>
        </div>
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
                placeholder="Search deal or customer name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Pipeline Stages</option>
              <option value="Qualification">Qualification</option>
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
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
              <option value="Open">Open</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
          <div className="col-md-3 d-flex gap-2">
            <button type="submit" className="btn btn-dark flex-grow-1">
              Search
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setSearch("");
                setStageFilter("");
                setStatusFilter("");
                setPage(1);
                fetchOpportunities("");
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Opportunities Table */}
      <div className="card-crm p-0 overflow-hidden">
        {loading ? (
          <div className="py-5">
            <LoadingSpinner message="Loading opportunity deals..." />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-briefcase display-4 text-muted mb-3"></i>
            <h5 className="fw-semibold text-secondary">No Opportunities Found</h5>
            <p className="text-muted small">No deals match your filter settings.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-crm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Deal Name</th>
                  <th>Customer Account</th>
                  <th>Stage</th>
                  <th>Deal Value</th>
                  <th>Win Prob.</th>
                  <th>Weighted Value</th>
                  <th>Target Close</th>
                  <th>Owner</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opp) => (
                  <tr key={opp.id}>
                    <td>
                      <div className="fw-bold text-dark">{opp.opportunity_name}</div>
                      {opp.notes && <div className="small text-muted text-truncate" style={{ maxWidth: "160px" }}>{opp.notes}</div>}
                    </td>
                    <td>
                      <span className="fw-semibold text-primary">{opp.customer_name || "Customer"}</span>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(opp.stage)}>{opp.stage}</span>
                    </td>
                    <td className="fw-bold text-dark">{formatCurrency(opp.amount)}</td>
                    <td>
                      <div className="d-flex align-items-center">
                        <span className="small fw-semibold me-2">{opp.probability}%</span>
                        <div className="progress flex-grow-1" style={{ height: "6px", width: "40px" }}>
                          <div
                            className={`progress-bar ${
                              opp.probability >= 70 ? "bg-success" : opp.probability >= 40 ? "bg-warning" : "bg-info"
                            }`}
                            style={{ width: `${opp.probability}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="fw-bold text-success">{formatCurrency(opp.weighted_value)}</td>
                    <td className="small text-secondary">{formatDate(opp.expected_close_date)}</td>
                    <td className="small text-muted">{opp.assigned_user_name || "Sales Rep"}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          title="Edit Opportunity"
                          onClick={() => handleOpenEdit(opp)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          title="Delete Opportunity"
                          onClick={() => handleOpenDelete(opp)}
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
      <OpportunityFormModal
        show={formModalOpen}
        opportunity={selectedOpp}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg(selectedOpp ? "Deal updated successfully!" : "New deal opened successfully!");
          fetchOpportunities();
        }}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        show={deleteModalOpen}
        title="Delete Opportunity"
        message={`Are you sure you want to delete opportunity "${oppToDelete?.opportunity_name}"?`}
        confirmText="Delete Deal"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
