import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user, isAdmin, isManager } = useAuth();

  return (
    <aside className="sidebar">
      <div className="brand">
        <i className="bi bi-briefcase-fill text-primary me-2"></i>
        <span>Acxiom<span className="text-primary">CRM</span></span>
      </div>

      <div className="px-3 py-3 border-bottom border-secondary border-opacity-25">
        <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: "0.7rem", letterSpacing: "1px" }}>
          Logged in as
        </div>
        <div className="text-white fw-medium text-truncate">{user?.name}</div>
        <span className="badge bg-primary bg-opacity-75 mt-1" style={{ fontSize: "0.7rem" }}>
          {user?.role?.name}
        </span>
      </div>

      <nav className="nav flex-column py-2 flex-grow-1">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <i className="bi bi-speedometer2"></i>
          <span>Dashboard</span>
        </NavLink>

        <div className="small text-uppercase text-muted px-3 mt-3 mb-1" style={{ fontSize: "0.65rem", letterSpacing: "1px" }}>
          CRM Core
        </div>

        <NavLink to="/customers" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <i className="bi bi-people-fill"></i>
          <span>Customers</span>
        </NavLink>

        <NavLink to="/leads" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <i className="bi bi-funnel-fill"></i>
          <span>Leads</span>
        </NavLink>

        <NavLink to="/opportunities" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <i className="bi bi-graph-up-arrow"></i>
          <span>Opportunities</span>
        </NavLink>

        <NavLink to="/opportunities/pipeline" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <i className="bi bi-kanban-fill"></i>
          <span>Pipeline Board</span>
        </NavLink>

        <div className="small text-uppercase text-muted px-3 mt-3 mb-1" style={{ fontSize: "0.65rem", letterSpacing: "1px" }}>
          Sales Engagement
        </div>

        <NavLink to="/followups" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <i className="bi bi-calendar-check-fill"></i>
          <span>Follow-Ups</span>
        </NavLink>

        <NavLink to="/activities" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <i className="bi bi-list-task"></i>
          <span>Activities</span>
        </NavLink>

        <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <i className="bi bi-file-earmark-bar-graph-fill"></i>
          <span>Reports & Analytics</span>
        </NavLink>

        {(isAdmin || isManager) && (
          <>
            <div className="small text-uppercase text-muted px-3 mt-3 mb-1" style={{ fontSize: "0.65rem", letterSpacing: "1px" }}>
              Administration
            </div>

            <NavLink to="/admin/users" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <i className="bi bi-person-badge-fill"></i>
              <span>User Management</span>
            </NavLink>
          </>
        )}

        {isAdmin && (
          <NavLink to="/admin/audit-logs" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <i className="bi bi-journal-text"></i>
            <span>Audit Logs</span>
          </NavLink>
        )}
      </nav>

      <div className="p-3 border-top border-secondary border-opacity-25 small text-muted text-center">
        AcxiomCRM v1.0.0
      </div>
    </aside>
  );
}
