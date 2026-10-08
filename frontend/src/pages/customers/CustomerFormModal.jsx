import React, { useState, useEffect } from "react";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import { validateEmail, validatePhone } from "../../utils/validators";

export default function CustomerFormModal({ show, customer, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    customer_name: "",
    email: "",
    phone: "",
    company_name: "",
    address: "",
    city: "",
    state: "",
    status: "Active",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        customer_name: customer.customer_name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        company_name: customer.company_name || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        status: customer.status || "Active",
      });
    } else {
      setFormData({
        customer_name: "",
        email: "",
        phone: "",
        company_name: "",
        address: "",
        city: "",
        state: "",
        status: "Active",
      });
    }
    setFieldErrors({});
    setServerError("");
  }, [customer, show]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = {};
    if (!formData.customer_name.trim()) errors.customer_name = "Customer Name is required.";
    const emailErr = validateEmail(formData.email);
    if (emailErr) errors.email = emailErr;
    const phoneErr = validatePhone(formData.phone);
    if (phoneErr) errors.phone = phoneErr;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      if (customer) {
        await api.put(`/customers/${customer.id}`, formData);
      } else {
        await api.post("/customers", formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setServerError(err.userMessage || "Failed to save customer record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow border-0" style={{ borderRadius: "12px" }}>
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold">
              {customer ? `Edit Customer (${customer.customer_code})` : "Add New Customer"}
            </h5>
            <button type="button" className="btn-close" disabled={loading} onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body py-3">
              {serverError && <AlertBanner type="danger" message={serverError} onClose={() => setServerError("")} />}

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Customer Name *</label>
                  <input
                    type="text"
                    name="customer_name"
                    className={`form-control ${fieldErrors.customer_name ? "is-invalid" : ""}`}
                    placeholder="Acme Global Inc."
                    value={formData.customer_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.customer_name && <div className="invalid-feedback">{fieldErrors.customer_name}</div>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    name="company_name"
                    className="form-control"
                    placeholder="Acme Enterprises"
                    value={formData.company_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                    placeholder="contact@acme.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="text"
                    name="phone"
                    className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`}
                    placeholder="+1-555-019-2834"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
                </div>

                <div className="col-md-12">
                  <label className="form-label">Street Address</label>
                  <input
                    type="text"
                    name="address"
                    className="form-control"
                    placeholder="123 Market Street, Suite 400"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    name="city"
                    className="form-control"
                    placeholder="San Francisco"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">State / Province</label>
                  <input
                    type="text"
                    name="state"
                    className="form-control"
                    placeholder="California"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Account Status</label>
                  <select
                    name="status"
                    className="form-select"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light" disabled={loading} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary-crm d-flex align-items-center" disabled={loading}>
                {loading && <span className="spinner-border spinner-border-sm me-2" role="status"></span>}
                {customer ? "Update Customer" : "Create Customer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
