import React, { useState, useEffect } from "react";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import { validateOpportunity } from "../../utils/validators";

export default function LeadConvertModal({ show, lead, onClose, onSuccess }) {
  const [createOpportunity, setCreateOpportunity] = useState(true);
  const [opportunityName, setOpportunityName] = useState("");
  const [opportunityAmount, setOpportunityAmount] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lead) {
      setOpportunityName(`Deal: ${lead.company_name || lead.lead_name}`);
      setOpportunityAmount(lead.expected_value || 10000);
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setExpectedCloseDate(defaultDate.toISOString().split("T")[0]);
      setCreateOpportunity(true);
      setFieldErrors({});
      setServerError("");
    }
  }, [lead, show]);

  if (!show || !lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = {};
    if (createOpportunity) {
      const oppErrors = validateOpportunity(opportunityAmount, 20, expectedCloseDate, "Qualification");
      if (oppErrors.amount) errors.opportunityAmount = oppErrors.amount;
      if (oppErrors.closeDate) errors.expectedCloseDate = oppErrors.closeDate;
      if (!opportunityName.trim()) errors.opportunityName = "Opportunity Name is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const payload = {
        company_name: lead.company_name,
        create_opportunity: createOpportunity,
        opportunity_name: createOpportunity ? opportunityName.trim() : null,
        opportunity_amount: createOpportunity ? Number(opportunityAmount) : null,
        expected_close_date: createOpportunity ? expectedCloseDate : null,
      };

      const res = await api.post(`/leads/${lead.id}/convert`, payload);
      onSuccess(res.data);
      onClose();
    } catch (err) {
      setServerError(err.userMessage || "Failed to convert lead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow border-0" style={{ borderRadius: "12px" }}>
          <div className="modal-header border-0 pb-0">
            <div>
              <h5 className="modal-title fw-bold text-success">
                <i className="bi bi-patch-check-fill me-2"></i>Convert Qualified Lead
              </h5>
              <div className="small text-muted">{lead.lead_name} ({lead.lead_code})</div>
            </div>
            <button type="button" className="btn-close" disabled={loading} onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body py-3">
              {serverError && <AlertBanner type="danger" message={serverError} onClose={() => setServerError("")} />}

              <div className="alert alert-light border small text-muted mb-3">
                Converting this lead creates a new verified <strong>Customer Account</strong> (preventing duplicates if matched) and marks the lead as Converted in audit history.
              </div>

              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="createOppCheck"
                  checked={createOpportunity}
                  onChange={(e) => setCreateOpportunity(e.target.checked)}
                  disabled={loading}
                />
                <label className="form-check-label fw-semibold" htmlFor="createOppCheck">
                  Simultaneously open an Opportunity deal in Pipeline
                </label>
              </div>

              {createOpportunity && (
                <div className="p-3 bg-light rounded-3 border">
                  <div className="mb-3">
                    <label className="form-label">Opportunity Name *</label>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors.opportunityName ? "is-invalid" : ""}`}
                      value={opportunityName}
                      onChange={(e) => setOpportunityName(e.target.value)}
                      disabled={loading}
                    />
                    {fieldErrors.opportunityName && (
                      <div className="invalid-feedback">{fieldErrors.opportunityName}</div>
                    )}
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label">Deal Amount ($) *</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        className={`form-control ${fieldErrors.opportunityAmount ? "is-invalid" : ""}`}
                        value={opportunityAmount}
                        onChange={(e) => setOpportunityAmount(e.target.value)}
                        disabled={loading}
                      />
                      {fieldErrors.opportunityAmount && (
                        <div className="invalid-feedback">{fieldErrors.opportunityAmount}</div>
                      )}
                    </div>
                    <div className="col-6">
                      <label className="form-label">Target Close Date *</label>
                      <input
                        type="date"
                        className={`form-control ${fieldErrors.expectedCloseDate ? "is-invalid" : ""}`}
                        value={expectedCloseDate}
                        onChange={(e) => setExpectedCloseDate(e.target.value)}
                        disabled={loading}
                      />
                      {fieldErrors.expectedCloseDate && (
                        <div className="invalid-feedback">{fieldErrors.expectedCloseDate}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light" disabled={loading} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-success d-flex align-items-center" disabled={loading}>
                {loading && <span className="spinner-border spinner-border-sm me-2" role="status"></span>}
                <i className="bi bi-arrow-repeat me-1"></i> Confirm Conversion
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
