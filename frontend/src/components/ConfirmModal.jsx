import React from "react";

export default function ConfirmModal({
  show,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow border-0" style={{ borderRadius: "12px" }}>
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold">{title}</h5>
            <button type="button" className="btn-close" disabled={loading} onClick={onCancel}></button>
          </div>
          <div className="modal-body py-3">
            <p className="text-secondary mb-0">{message}</p>
          </div>
          <div className="modal-footer border-0 pt-0">
            <button type="button" className="btn btn-light" disabled={loading} onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className={`btn btn-${confirmVariant} d-flex align-items-center`}
              disabled={loading}
              onClick={onConfirm}
            >
              {loading && <span className="spinner-border spinner-border-sm me-2" role="status"></span>}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
