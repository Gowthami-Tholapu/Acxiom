import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="vh-100 d-flex align-items-center justify-content-center">
        <LoadingSpinner message="Checking authentication session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div className="container py-5 text-center">
        <div className="card-crm p-5 mx-auto" style={{ maxWidth: "540px" }}>
          <i className="bi bi-shield-lock-fill text-danger display-1 mb-3"></i>
          <h3 className="fw-bold text-dark">Access Forbidden</h3>
          <p className="text-muted mb-4">
            You do not have the required permissions to access this screen ({allowedRoles.join(" or ")} required).
          </p>
          <a href="/dashboard" className="btn btn-primary-crm mx-auto">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}
