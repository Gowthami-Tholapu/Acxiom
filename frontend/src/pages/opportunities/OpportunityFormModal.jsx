import React, { useState, useEffect } from "react";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import { validateOpportunity } from "../../utils/validators";

export default function OpportunityFormModal({ show, opportunity, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    opportunity_name: "",
    customer_id: "",
    amount: "",
    stage: "Qualification",
    probability: 20,
    expected_close_date: "",
    notes: "",
  });
  const [customers, setCustomers] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      loadCustomers();
    }
  }, [show]);

  useEffect(() => {
    if (opportunity) {
      setFormData({
        opportunity_name: opportunity.opportunity_name || "",
        customer_id: opportunity.customer_id || "",
        amount: opportunity.amount || "",
        stage: opportunity.stage || "Qualification",
        probability: opportunity.probability !== undefined ? opportunity.probability : 20,
        expected_close_date: opportunity.expected_close_date || "",
        notes: opportunity.notes || "",
      });
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setFormData({
        opportunity_name: "",
        customer_id: "",
        amount: "",
        stage: "Qualification",
        probability: 20,
        expected_close_date: defaultDate.toISOString().split("T")[0],
        notes: "",
      });
    }
    setFieldErrors({});
    setServerError("");
  }, [opportunity, show]);

  async function loadCustomers() {
    try {
      const res = await api.get("/customers?page_size=100");
      setCustomers(res.data.items || []);
    } catch (e) {
      // Ignore
    }
  }

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // Auto adjust probability on stage change if creating
    if (name === "stage" && !opportunity) {
      if (value === "Qualification") newFormData.probability = 20;
      else if (value === "Proposal") newFormData.probability = 50;
      else if (value === "Negotiation") newFormData.probability = 75;
      else if (value === "Won") newFormData.probability = 100;
      else if (value === "Lost") newFormData.probability = 0;
    }

    setFormData(newFormData);
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = {};
    if (!formData.opportunity_name.trim()) errors.opportunity_name = "Deal name is required.";
    if (!formData.customer_id) errors.customer_id = "Please select a Customer account.";

    const oppErrors = validateOpportunity(
      formData.amount,
      formData.probability,
      formData.expected_close_date,
      formData.stage
    );
    if (oppErrors.amount) errors.amount = oppErrors.amount;
    if (oppErrors.probability) errors.probability = oppErrors.probability;
    if (oppErrors.closeDate) errors.expected_close_date = oppErrors.closeDate;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const payload = {
        opportunity_name: formData.opportunity_name.trim(),
        customer_id: Number(formData.customer_id),
        amount: Number(formData.amount),
        stage: formData.stage,
        probability: Number(formData.probability),
        expected_close_date: formData.expected_close_date,
        notes: formData.notes.trim() || null,
      };

      if (opportunity) {
        await api.put(`/opportunities/${opportunity.id}`, payload);
      } else {
        await api.post("/opportunities", payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setServerError(err.userMessage || "Failed to save opportunity deal.");
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
              {opportunity ? `Edit Deal (${opportunity.opportunity_name})` : "Create New Opportunity Deal"}
            </h5>
            <button type="button" className="btn-close" disabled={loading} onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body py-3">
              {serverError && <AlertBanner type="danger" message={serverError} onClose={() => setServerError("")} />}

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Deal / Opportunity Name *</label>
                  <input
                    type="text"
                    name="opportunity_name"
                    className={`form-control ${fieldErrors.opportunity_name ? "is-invalid" : ""}`}
                    placeholder="Enterprise Software License"
                    value={formData.opportunity_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.opportunity_name && (
                    <div className="invalid-feedback">{fieldErrors.opportunity_name}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Customer Account *</label>
                  <select
                    name="customer_id"
                    className={`form-select ${fieldErrors.customer_id ? "is-invalid" : ""}`}
                    value={formData.customer_id}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customer_name} ({c.customer_code})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.customer_id && <div className="invalid-feedback">{fieldErrors.customer_id}</div>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Deal Amount ($) *</label>
                  <input
                    type="number"
                    name="amount"
                    min="1"
                    step="any"
                    className={`form-control ${fieldErrors.amount ? "is-invalid" : ""}`}
                    placeholder="e.g. 50000"
                    value={formData.amount}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.amount && <div className="invalid-feedback">{fieldErrors.amount}</div>}
                  <div className="form-text" style={{ fontSize: "0.75rem" }}>
                    Must be &gt; 0 for active sales deals.
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Pipeline Stage *</label>
                  <select
                    name="stage"
                    className="form-select"
                    value={formData.stage}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="Qualification">Qualification</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won (Closed Won)</option>
                    <option value="Lost">Lost (Closed Lost)</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Win Probability (% 0-100) *</label>
                  <input
                    type="number"
                    name="probability"
                    min="0"
                    max="100"
                    step="1"
                    className={`form-control ${fieldErrors.probability ? "is-invalid" : ""}`}
                    value={formData.probability}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.probability && (
                    <div className="invalid-feedback">{fieldErrors.probability}</div>
                  )}
                  <div className="form-text text-muted" style={{ fontSize: "0.75rem" }}>
                    Calculates weighted pipeline: ${(
                      (Number(formData.amount || 0) * Number(formData.probability || 0)) /
                      100
                    ).toLocaleString()}
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Expected Close Date *</label>
                  <input
                    type="date"
                    name="expected_close_date"
                    className={`form-control ${fieldErrors.expected_close_date ? "is-invalid" : ""}`}
                    value={formData.expected_close_date}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {fieldErrors.expected_close_date && (
                    <div className="invalid-feedback">{fieldErrors.expected_close_date}</div>
                  )}
                  <div className="form-text" style={{ fontSize: "0.75rem" }}>
                    Cannot be in the past for active deals.
                  </div>
                </div>

                <div className="col-md-12">
                  <label className="form-label">Notes & Next Actions</label>
                  <textarea
                    name="notes"
                    rows="2"
                    className="form-control"
                    placeholder="Key decision makers, terms, obstacles, notes..."
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
                {opportunity ? "Update Deal" : "Save Deal"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
