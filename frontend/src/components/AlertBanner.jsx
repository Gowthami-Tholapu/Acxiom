import React from "react";

export default function AlertBanner({ type = "danger", message, onClose }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${type} alert-dismissible fade show d-flex align-items-center mb-3`} role="alert">
      <i className={`bi ${type === "danger" ? "bi-exclamation-octagon-fill" : "bi-check-circle-fill"} me-2 fs-5`}></i>
      <div className="flex-grow-1">{message}</div>
      {onClose && (
        <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
      )}
    </div>
  );
}
