import React, { useState, useEffect } from "react";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import { validateEmail, validatePhone } from "../../utils/validators";

export default function LeadFormModal({ show, lead, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    lead_name: "",
    email: "",
    phone: "",
    company_name: "",
    source: "Website",
    status: "New",
    priority: "Medium",
    expected_value: 0,
    notes: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        lead_name: lead.lead_name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        company_name: lead.company_name || "",
        source: lead.source || "Website",
        status: lead.status || "New",
        priority: lead.priority || "Medium",
        expected_value: lead.expected_value || 0,
        notes: lead.notes || "",
      });
    } else {
      setFormData({
        lead_name: "",
        email: "",
        phone: "",
        company_name: "",
        source: "Website",
        status: "New",
        priority: "Medium",
        expected_value: 0,
        notes: "",
      });
    }
    setFieldErrors({});
    setServerError("");
  }, [lead, show]);

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
    if (!formData.lead_name.trim()) errors.lead_name = "Lead Name is required.";
    const emailErr = validateEmail(formData.email);
    if (emailErr) errors.email = emailErr;
    const phoneErr = validatePhone(formData.phone);
    if (phoneErr) errors.phone = phoneErr;
    if (Number(formData.expected_value) < 0) errors.expected_value = "Expected value cannot be negative.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const payload = {
        ...formData,
        expected_value: Number(formData.expected_value) || 0,
      };
      if (lead) {
        await api.put(`/leads/${lead.id}`, payload);
      } else {
        await api.post("/leads", payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setServerError(err.userMessage || "Failed to save lead record.");
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
              {lead ? `Edit Lead (${lead.lead_code})` : "Capture Inbound Lead"}
            </h5>
            <button type="button" className="btn-close" disabled={loading} onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body py-3">
              {serverError && <AlertBanner type="danger" message={serverError} onClose={() => setServerError("")} />}

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Lead Name *</label>
                  <input
                    type="text"
                    name="lead_name"
                    className={`form-control ${fieldErrors.lead_name ? "is-invalid" : ""}`}
                    placeholder="Prospect Contact Name"
                    value={formData.lead_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.lead_name && <div className="invalid-feedback">{fieldErrors.lead_name}</div>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    name="company_name"
                    className="form-control"
                    placeholder="Prospect Organization"
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
                    placeholder="prospect@company.com"
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

                <div className="col-md-4">
                  <label className="form-label">Lead Source</label>
                  <select
                    name="source"
                    className="form-select"
                    value={formData.source}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Campaign">Campaign</option>
                    <option value="Trade Show">Trade Show</option>
                    <option value="Partner">Partner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">Status</label>
                  <select
                    name="status"
                    className="form-select"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={loading || (lead && lead.status === "Converted")}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Unqualified">Unqualified</option>
                    <option value="Lost">Lost</option>
                    {lead && lead.status === "Converted" && <option value="Converted">Converted</option>}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">Priority</label>
                  <select
                    name="priority"
                    className="form-select"
                    value={formData.priority}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Expected Value ($)</label>
                  <input
                    type="number"
                    name="expected_value"
                    min="0"
                    step="any"
                    className={`form-control ${fieldErrors.expected_value ? "is-invalid" : ""}`}
                    value={formData.expected_value}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.expected_value && <div className="invalid-feedback">{fieldErrors.expected_value}</div>}
                </div>

                <div className="col-md-12">
                  <label className="form-label">Notes & Requirements</label>
                  <textarea
                    name="notes"
                    rows="3"
                    className="form-control"
                    placeholder="Initial customer requirements, context, or meeting notes..."
                    value={formData.notes}
                    onChange={handleChange}
                    disabled={loading}
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light" disabled={loading} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary-crm d-flex align-items-center" disabled={loading}>
                {loading && <span className="spinner-border spinner-border-sm me-2" role="status"></span>}
                {lead ? "Update Lead" : "Save Lead"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
