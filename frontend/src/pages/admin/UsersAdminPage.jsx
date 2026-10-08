import React, { useEffect, useState } from "react";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import ConfirmModal from "../../components/ConfirmModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import Pagination from "../../components/Pagination";
import { useAuth } from "../../context/AuthContext";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { validateEmail, validatePassword } from "../../utils/validators";

export default function UsersAdminPage() {
  const { user: currentUser, isAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role_id: 3 });
  const [selectedRoleId, setSelectedRoleId] = useState(3);
  const [newPassword, setNewPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [page]);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/users?page=${page}&page_size=${pageSize}`);
      setUsers(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setError(err.userMessage || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchRoles() {
    try {
      const res = await api.get("/users/roles");
      setRoles(res.data || []);
      if (res.data.length > 0) {
        const salesRole = res.data.find((r) => r.name === "SalesExecutive") || res.data[0];
        setCreateForm((prev) => ({ ...prev, role_id: salesRole.id }));
      }
    } catch (e) {
      // Ignore
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!createForm.name.trim()) errors.name = "Name is required.";
    const emailErr = validateEmail(createForm.email);
    if (emailErr) errors.email = emailErr;
    const pwErr = validatePassword(createForm.password);
    if (pwErr) errors.password = pwErr;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setActionLoading(true);
    try {
      await api.post("/users", {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role_id: Number(createForm.role_id),
      });
      setSuccessMsg(`User "${createForm.name}" created successfully!`);
      setCreateModalOpen(false);
      setCreateForm({ name: "", email: "", password: "", role_id: roles[0]?.id || 3 });
      fetchUsers();
    } catch (err) {
      setError(err.userMessage || "Failed to create user.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.id === currentUser.id) {
      setError("You cannot deactivate your own account.");
      return;
    }
    try {
      const newStatus = !user.is_active;
      await api.patch(`/users/${user.id}/status`, { is_active: newStatus });
      setSuccessMsg(`User "${user.name}" status updated to ${newStatus ? "Active" : "Inactive"}.`);
      fetchUsers();
    } catch (err) {
      setError(err.userMessage || "Failed to change user status.");
    }
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await api.patch(`/users/${selectedUser.id}/role`, { role_id: Number(selectedRoleId) });
      setSuccessMsg(`Role for "${selectedUser.name}" updated successfully!`);
      setRoleModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.userMessage || "Failed to update role.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    const pwErr = validatePassword(newPassword);
    if (pwErr) {
      setFieldErrors({ newPassword: pwErr });
      return;
    }
    setFieldErrors({});

    setActionLoading(true);
    try {
      await api.post(`/users/${selectedUser.id}/reset-password`, { new_password: newPassword });
      setSuccessMsg(`Password for "${selectedUser.name}" has been securely reset!`);
      setPwModalOpen(false);
      setNewPassword("");
      fetchUsers();
    } catch (err) {
      setError(err.userMessage || "Failed to reset password.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">User & Role Management</h3>
          <p className="text-muted small mb-0">System access control, role assignments, password resets, and account security status.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary-crm d-flex align-items-center" onClick={() => setCreateModalOpen(true)}>
            <i className="bi bi-person-plus-fill me-2"></i> Add Team User
          </button>
        )}
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg("")} />}
      {error && <AlertBanner type="danger" message={error} onClose={() => setError(null)} />}

      <div className="card-crm p-0 overflow-hidden">
        {loading ? (
          <div className="py-5">
            <LoadingSpinner message="Fetching user directory..." />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-crm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Failed Logins</th>
                  <th>Lockout Status</th>
                  <th>Created Date</th>
                  {isAdmin && <th className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isLocked = u.lockout_end && new Date(u.lockout_end) > new Date();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="fw-bold text-dark">{u.name}</div>
                        <div className="small text-muted">{u.email}</div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.role?.name === "Admin"
                              ? "bg-danger"
                              : u.role?.name === "Manager"
                              ? "bg-primary"
                              : "bg-success"
                          }`}
                        >
                          {u.role?.name}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.is_active ? "bg-success" : "bg-secondary"}`}>
                          {u.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.failed_login_count > 0 ? "bg-warning text-dark" : "bg-light text-muted border"}`}>
                          {u.failed_login_count} failures
                        </span>
                      </td>
                      <td>
                        {isLocked ? (
                          <span className="badge bg-danger">
                            <i className="bi bi-lock-fill me-1"></i> Locked ({formatDateTime(u.lockout_end)})
                          </span>
                        ) : (
                          <span className="badge bg-light text-success border">
                            <i className="bi bi-unlock-fill me-1"></i> Normal
                          </span>
                        )}
                      </td>
                      <td className="small text-muted">{formatDate(u.created_at)}</td>
                      {isAdmin && (
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-secondary"
                              title="Change Role"
                              onClick={() => {
                                setSelectedUser(u);
                                setSelectedRoleId(u.role_id);
                                setRoleModalOpen(true);
                              }}
                            >
                              <i className="bi bi-shield-check"></i>
                            </button>
                            <button
                              className="btn btn-outline-warning"
                              title="Reset Password"
                              onClick={() => {
                                setSelectedUser(u);
                                setNewPassword("");
                                setFieldErrors({});
                                setPwModalOpen(true);
                              }}
                            >
                              <i className="bi bi-key-fill"></i>
                            </button>
                            <button
                              className={`btn ${u.is_active ? "btn-outline-danger" : "btn-outline-success"}`}
                              title={u.is_active ? "Deactivate Account" : "Activate Account"}
                              disabled={u.id === currentUser.id}
                              onClick={() => handleToggleStatus(u)}
                            >
                              <i className={`bi ${u.is_active ? "bi-person-dash" : "bi-person-check"}`}></i>
                            </button>
                          </div>
                        </td>
                      )}
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

      {/* Create User Modal */}
      {createModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0" style={{ borderRadius: "12px" }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Provision New CRM User</h5>
                <button type="button" className="btn-close" disabled={actionLoading} onClick={() => setCreateModalOpen(false)}></button>
              </div>
              <form onSubmit={handleCreateUser} noValidate>
                <div className="modal-body py-3">
                  <div className="mb-3">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      disabled={actionLoading}
                    />
                    {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      disabled={actionLoading}
                    />
                    {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Temporary Password *</label>
                    <input
                      type="password"
                      className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      disabled={actionLoading}
                    />
                    {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
                    <div className="form-text" style={{ fontSize: "0.75rem" }}>
                      Min 8 chars with uppercase, lowercase, digit, and special char.
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">System Role *</label>
                    <select
                      className="form-select"
                      value={createForm.role_id}
                      onChange={(e) => setCreateForm({ ...createForm, role_id: Number(e.target.value) })}
                      disabled={actionLoading}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light" disabled={actionLoading} onClick={() => setCreateModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary-crm d-flex align-items-center" disabled={actionLoading}>
                    {actionLoading && <span className="spinner-border spinner-border-sm me-2" role="status"></span>}
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {roleModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0" style={{ borderRadius: "12px" }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Change Role: {selectedUser?.name}</h5>
                <button type="button" className="btn-close" disabled={actionLoading} onClick={() => setRoleModalOpen(false)}></button>
              </div>
              <div className="modal-body py-3">
                <label className="form-label">Select Role</label>
                <select
                  className="form-select"
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                  disabled={actionLoading}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-light" disabled={actionLoading} onClick={() => setRoleModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary-crm" disabled={actionLoading} onClick={handleSaveRole}>
                  {actionLoading && <span className="spinner-border spinner-border-sm me-2" role="status"></span>}
                  Save Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {pwModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0" style={{ borderRadius: "12px" }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Reset Password: {selectedUser?.name}</h5>
                <button type="button" className="btn-close" disabled={actionLoading} onClick={() => setPwModalOpen(false)}></button>
              </div>
              <form onSubmit={handleResetPassword} noValidate>
                <div className="modal-body py-3">
                  <label className="form-label">New Password *</label>
                  <input
                    type="password"
                    className={`form-control ${fieldErrors.newPassword ? "is-invalid" : ""}`}
                    placeholder="Min 8 characters (with uppercase, digit, symbol)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={actionLoading}
                  />
                  {fieldErrors.newPassword && <div className="invalid-feedback">{fieldErrors.newPassword}</div>}
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light" disabled={actionLoading} onClick={() => setPwModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning d-flex align-items-center" disabled={actionLoading}>
                    {actionLoading && <span className="spinner-border spinner-border-sm me-2" role="status"></span>}
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
