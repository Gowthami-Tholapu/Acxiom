import React, { useState, useEffect } from "react";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";

export default function ActivityFormModal({ show, activity, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    subject: "",
    activity_type: "Call",
    activity_date: "",
    description: "",
    status: "Completed",
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
    if (activity) {
      let dt = "";
      if (activity.activity_date) {
        dt = new Date(activity.activity_date).toISOString().slice(0, 16);
      }
      setFormData({
        subject: activity.subject || "",
        activity_type: activity.activity_type || "Call",
        activity_date: dt,
        description: activity.description || "",
        status: activity.status || "Completed",
        customer_id: activity.customer_id || "",
        lead_id: activity.lead_id || "",
      });
    } else {
      const now = new Date();
      setFormData({
        subject: "",
        activity_type: "Call",
        activity_date: now.toISOString().slice(0, 16),
        status: "Completed",
        description: "",
        customer_id: "",
        lead_id: "",
      });
    }
    setFieldErrors({});
    setServerError("");
  }, [activity, show]);

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
    if (!formData.activity_date) errors.activity_date = "Activity date & time is required.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const payload = {
        subject: formData.subject.trim(),
        activity_type: formData.activity_type,
        activity_date: new Date(formData.activity_date).toISOString(),
        status: formData.status,
        description: formData.description.trim() || null,
        customer_id: formData.customer_id ? Number(formData.customer_id) : null,
        lead_id: formData.lead_id ? Number(formData.lead_id) : null,
      };

      if (activity) {
        await api.put(`/activities/${activity.id}`, payload);
      } else {
        await api.post("/activities", payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setServerError(err.userMessage || "Failed to record activity.");
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
              {activity ? "Edit Sales Activity" : "Log New Sales Activity"}
            </h5>
            <button type="button" className="btn-close" disabled={loading} onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body py-3">
              {serverError && <AlertBanner type="danger" message={serverError} onClose={() => setServerError("")} />}

              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label">Activity Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    className={`form-control ${fieldErrors.subject ? "is-invalid" : ""}`}
                    placeholder="e.g. Discovery call with technical leadership"
                    value={formData.subject}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.subject && <div className="invalid-feedback">{fieldErrors.subject}</div>}
                </div>

                <div className="col-md-4">
                  <label className="form-label">Activity Type</label>
                  <select
                    name="activity_type"
                    className="form-select"
                    value={formData.activity_type}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="Call">Call</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Email">Email</option>
                    <option value="Task">Task</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">Activity Date & Time *</label>
                  <input
                    type="datetime-local"
                    name="activity_date"
                    className={`form-control ${fieldErrors.activity_date ? "is-invalid" : ""}`}
                    value={formData.activity_date}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.activity_date && (
                    <div className="invalid-feedback">{fieldErrors.activity_date}</div>
                  )}
                </div>

                <div className="col-md-4">
                  <label className="form-label">Status</label>
                  <select
                    name="status"
                    className="form-select"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="Completed">Completed</option>
                    <option value="Planned">Planned</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
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
                  <label className="form-label">Detailed Notes / Summary</label>
                  <textarea
                    name="description"
                    rows="3"
                    className="form-control"
                    placeholder="Discussion notes, objections raised, attendees, key next steps..."
                    value={formData.description}
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
                {activity ? "Update Activity" : "Record Activity"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
