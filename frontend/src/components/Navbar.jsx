import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="topbar">
      <div className="d-flex align-items-center">
        <button
          className="btn btn-sm btn-light border d-md-none me-2"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation"
        >
          <i className="bi bi-list fs-5"></i>
        </button>
        <span className="text-muted small fw-medium">
          Sales Organization Management Portal
        </span>
      </div>

      <div className="d-flex align-items-center gap-3">
        <div className="text-end d-none d-sm-block">
          <div className="fw-semibold text-dark small">{user?.name}</div>
          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
            {user?.email}
          </div>
        </div>

        <div
          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
          style={{ width: "36px", height: "36px", fontSize: "0.85rem" }}
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>

        <button
          className="btn btn-outline-danger btn-sm d-flex align-items-center"
          onClick={handleLogout}
          title="Sign Out"
        >
          <i className="bi bi-box-arrow-right me-1"></i>
          <span className="d-none d-sm-inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
