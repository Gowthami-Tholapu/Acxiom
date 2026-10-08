import React from "react";

export default function StatsCard({ title, value, icon, color = "primary", subtitle }) {
  const bgColors = {
    primary: "rgba(79, 70, 229, 0.12)",
    success: "rgba(16, 185, 129, 0.12)",
    warning: "rgba(245, 158, 11, 0.12)",
    danger: "rgba(239, 68, 68, 0.12)",
    info: "rgba(14, 165, 233, 0.12)",
    purple: "rgba(168, 85, 247, 0.12)",
  };

  const textColors = {
    primary: "#4f46e5",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#0ea5e9",
    purple: "#a855f7",
  };

  return (
    <div className="card-crm p-3 h-100">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <div className="text-muted small text-uppercase fw-semibold mb-1">{title}</div>
          <div className="fs-3 fw-bold text-dark">{value}</div>
          {subtitle && <div className="text-secondary small mt-1">{subtitle}</div>}
        </div>
        <div
          className="stat-icon"
          style={{
            backgroundColor: bgColors[color] || bgColors.primary,
            color: textColors[color] || textColors.primary,
          }}
        >
          <i className={`bi ${icon}`}></i>
        </div>
      </div>
    </div>
  );
}
