import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import AuthLayout from "../layouts/AuthLayout";
import MainLayout from "../layouts/MainLayout";

import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import DashboardPage from "../pages/dashboard/DashboardPage";

import CustomersListPage from "../pages/customers/CustomersListPage";
import CustomerDetailPage from "../pages/customers/CustomerDetailPage";

import LeadsListPage from "../pages/leads/LeadsListPage";

import OpportunitiesListPage from "../pages/opportunities/OpportunitiesListPage";
import PipelineKanbanPage from "../pages/opportunities/PipelineKanbanPage";

import FollowUpsListPage from "../pages/followups/FollowUpsListPage";
import ActivitiesListPage from "../pages/activities/ActivitiesListPage";
import ReportsPage from "../pages/reports/ReportsPage";

import UsersAdminPage from "../pages/admin/UsersAdminPage";
import AuditLogsPage from "../pages/admin/AuditLogsPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Authenticated CRM Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Customer Management */}
        <Route path="/customers" element={<CustomersListPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />

        {/* Lead Management */}
        <Route path="/leads" element={<LeadsListPage />} />

        {/* Opportunity Management */}
        <Route path="/opportunities" element={<OpportunitiesListPage />} />
        <Route path="/opportunities/pipeline" element={<PipelineKanbanPage />} />

        {/* Follow-Up Management */}
        <Route path="/followups" element={<FollowUpsListPage />} />

        {/* Activity Management */}
        <Route path="/activities" element={<ActivitiesListPage />} />

        {/* Reports */}
        <Route path="/reports" element={<ReportsPage />} />

        {/* Administration */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
              <UsersAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
