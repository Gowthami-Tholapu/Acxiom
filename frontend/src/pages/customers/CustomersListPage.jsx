import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import ConfirmModal from "../../components/ConfirmModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import Pagination from "../../components/Pagination";
import { formatDate, getStatusBadgeClass } from "../../utils/formatters";
import CustomerFormModal from "./CustomerFormModal";

export default function CustomersListPage() {
  const [customers, setCustomers] = useState([]);
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

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [page, statusFilter]);

  async function fetchCustomers(customSearch = search) {
    setLoading(true);
    setError(null);
    try {
      let url = `/customers?page=${page}&page_size=${pageSize}`;
      if (customSearch.trim()) url += `&search=${encodeURIComponent(customSearch.trim())}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await api.get(url);
      setCustomers(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setError(err.userMessage || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers(search);
  };

  const handleOpenCreate = () => {
    setSelectedCustomer(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (cust) => {
    setSelectedCustomer(cust);
    setFormModalOpen(true);
  };

  const handleOpenDelete = (cust) => {
    setCustomerToDelete(cust);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    setActionLoading(true);
    try {
      await api.delete(`/customers/${customerToDelete.id}`);
      setSuccessMsg(`Customer "${customerToDelete.customer_name}" processed successfully.`);
      setDeleteModalOpen(false);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (err) {
      setError(err.userMessage || "Failed to delete customer.");
      setDeleteModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Top action header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">Customer Management</h3>
          <p className="text-muted small mb-0">Master client database, contacts, and account statuses.</p>
        </div>
        <button className="btn btn-primary-crm d-flex align-items-center" onClick={handleOpenCreate}>
          <i className="bi bi-person-plus-fill me-2"></i> Add Customer
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
                placeholder="Search name, email, phone, company..."
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
              <option value="">All Account Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn btn-dark w-100">
              Search
            </button>
          </div>
          <div className="col-md-2">
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setPage(1);
                fetchCustomers("");
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Customers Table */}
      <div className="card-crm p-0 overflow-hidden">
        {loading ? (
          <div className="py-5">
            <LoadingSpinner message="Fetching customers..." />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-person-x display-4 text-muted mb-3"></i>
            <h5 className="fw-semibold text-secondary">No Customers Found</h5>
            <p className="text-muted small">No customer records match your filter criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-crm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer Name</th>
                  <th>Company</th>
                  <th>Contact Info</th>
                  <th>City / State</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="badge bg-light text-primary border fw-bold">{c.customer_code}</span>
                    </td>
                    <td>
                      <Link to={`/customers/${c.id}`} className="fw-bold text-dark text-decoration-none">
                        {c.customer_name}
                      </Link>
                    </td>
                    <td className="text-secondary">{c.company_name || "-"}</td>
                    <td>
                      <div className="small fw-medium text-dark">{c.email}</div>
                      <div className="small text-muted">{c.phone}</div>
                    </td>
                    <td className="small text-secondary">
                      {c.city ? `${c.city}${c.state ? `, ${c.state}` : ""}` : "-"}
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(c.status)}>{c.status}</span>
                    </td>
                    <td className="small text-muted">{formatDate(c.created_at)}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link to={`/customers/${c.id}`} className="btn btn-outline-secondary" title="View Details">
                          <i className="bi bi-eye"></i>
                        </Link>
                        <button
                          className="btn btn-outline-primary"
                          title="Edit Customer"
                          onClick={() => handleOpenEdit(c)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          title="Delete / Deactivate"
                          onClick={() => handleOpenDelete(c)}
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
      <CustomerFormModal
        show={formModalOpen}
        customer={selectedCustomer}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg(
            selectedCustomer ? "Customer updated successfully!" : "New customer created successfully!"
          );
          fetchCustomers();
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        show={deleteModalOpen}
        title="Confirm Customer Action"
        message={`Are you sure you want to delete or deactivate "${customerToDelete?.customer_name}"? Records with active opportunities will be safely marked Inactive.`}
        confirmText="Confirm Delete/Deactivate"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
