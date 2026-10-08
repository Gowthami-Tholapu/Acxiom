import React, { useState, useEffect } from "react";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import { validateFollowUp } from "../../utils/validators";

export default function FollowUpFormModal({ show, followUp, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    subject: "",
    follow_up_type: "Call",
    follow_up_date: "",
    status: "Planned",
    remarks: "",
    customer_id: "",
    lead_id: "",
  });
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      loadEntities();
    }
  }, [show]);

  useEffect(() => {
    if (followUp) {
      // Format datetime string for input
      let dt = "";
      if (followUp.follow_up_date) {
        dt = new Date(followUp.follow_up_date).toISOString().slice(0, 16);
      }
      setFormData({
        subject: followUp.subject || "",
        follow_up_type: followUp.follow_up_type || "Call",
        follow_up_date: dt,
        status: followUp.status || "Planned",
        remarks: followUp.remarks || "",
        customer_id: followUp.customer_id || "",
        lead_id: followUp.lead_id || "",
      });
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setFormData({
        subject: "",
        follow_up_type: "Call",
        follow_up_date: tomorrow.toISOString().slice(0, 16),
        status: "Planned",
        remarks: "",
        customer_id: "",
        lead_id: "",
      });
    }
    setFieldErrors({});
    setServerError("");
  }, [followUp, show]);

  async function loadEntities() {
    try {
      const [cRes, lRes] = await Promise.all([
        api.get("/customers?page_size=50"),
        api.get("/leads?page_size=50"),
      ]);
      setCustomers(cRes.data.items || []);
      setLeads(lRes.data.items || []);
    } catch (e) {
      // Ignore
    }
  }

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
    if (!formData.subject.trim()) errors.subject = "Subject is required.";
    const fuErrors = validateFollowUp(formData.follow_up_date, formData.status);
    if (fuErrors.followUpDate) errors.follow_up_date = fuErrors.followUpDate;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const payload = {
        subject: formData.subject.trim(),
        follow_up_type: formData.follow_up_type,
        follow_up_date: new Date(formData.follow_up_date).toISOString(),
        status: formData.status,
        remarks: formData.remarks.trim() || null,
        customer_id: formData.customer_id ? Number(formData.customer_id) : null,
        lead_id: formData.lead_id ? Number(formData.lead_id) : null,
      };

      if (followUp) {
        await api.put(`/followups/${followUp.id}`, payload);
      } else {
        await api.post("/followups", payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setServerError(err.userMessage || "Failed to schedule follow-up.");
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
              {followUp ? "Edit / Reschedule Follow-Up" : "Schedule Sales Follow-Up"}
            </h5>
            <button type="button" className="btn-close" disabled={loading} onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body py-3">
              {serverError && <AlertBanner type="danger" message={serverError} onClose={() => setServerError("")} />}

              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label">Subject / Purpose *</label>
                  <input
                    type="text"
                    name="subject"
                    className={`form-control ${fieldErrors.subject ? "is-invalid" : ""}`}
                    placeholder="e.g. Discuss revised proposal & implementation timeline"
                    value={formData.subject}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.subject && <div className="invalid-feedback">{fieldErrors.subject}</div>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Follow-Up Type</label>
                  <select
                    name="follow_up_type"
                    className="form-select"
                    value={formData.follow_up_type}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="Call">Call</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Email">Email</option>
                    <option value="Task">Task</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Status</label>
                  <select
                    name="status"
                    className="form-select"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="Planned">Planned</option>
                    <option value="Completed">Completed</option>
                    <option value="Missed">Missed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    name="follow_up_date"
                    className={`form-control ${fieldErrors.follow_up_date ? "is-invalid" : ""}`}
                    value={formData.follow_up_date}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.follow_up_date && (
                    <div className="invalid-feedback">{fieldErrors.follow_up_date}</div>
                  )}
                  <div className="form-text" style={{ fontSize: "0.75rem" }}>
                    Cannot be earlier than today for planned follow-ups.
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Related Customer (Optional)</label>
                  <select
                    name="customer_id"
                    className="form-select"
                    value={formData.customer_id}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">-- None / Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customer_name} ({c.customer_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Related Lead (Optional)</label>
                  <select
                    name="lead_id"
                    className="form-select"
                    value={formData.lead_id}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">-- None / Select Lead --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lead_name} ({l.lead_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-12">
                  <label className="form-label">Remarks / Notes</label>
                  <textarea
                    name="remarks"
                    rows="2"
                    className="form-control"
                    placeholder="Discussion agenda, outcome notes, or reschedule reason..."
                    value={formData.remarks}
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
                {followUp ? "Update Follow-Up" : "Schedule Follow-Up"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
