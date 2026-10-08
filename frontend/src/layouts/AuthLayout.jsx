import React from "react";
import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
      }}
    >
      <div className="w-100" style={{ maxWidth: "460px" }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-white shadow mb-3">
            <i className="bi bi-briefcase-fill text-primary fs-2"></i>
          </div>
          <h2 className="text-white fw-bold mb-1">AcxiomCRM</h2>
          <p className="text-white-50 small mb-0">Enterprise Sales Organization System</p>
        </div>
        <div className="card shadow-lg border-0" style={{ borderRadius: "16px" }}>
          <div className="card-body p-4 p-md-5">
            <Outlet />
          </div>
        </div>
        <div className="text-center mt-4 text-white-50 small">
          &copy; {new Date().getFullYear()} AcxiomCRM &bull; All Rights Reserved
        </div>
      </div>
    </div>
  );
}
