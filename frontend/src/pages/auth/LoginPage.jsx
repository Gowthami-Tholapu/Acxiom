import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AlertBanner from "../../components/AlertBanner";
import { useAuth } from "../../context/AuthContext";
import { validateEmail } from "../../utils/validators";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const handlePreFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFieldErrors({});
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const errors = {};
    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;
    if (!password) errors.password = "Password is required.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div>
      <h4 className="fw-bold text-dark mb-1">Sign In</h4>
      <p className="text-muted small mb-4">Enter your credentials to access your CRM workspace.</p>

      {errorMsg && <AlertBanner type="danger" message={errorMsg} onClose={() => setErrorMsg("")} />}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
        </div>

        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label className="form-label mb-0">Password</label>
          </div>
          <input
            type="password"
            className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
        </div>

        <button
          type="submit"
          className="btn btn-primary-crm w-100 py-2 d-flex align-items-center justify-content-center"
          disabled={loading}
        >
          {loading && <span className="spinner-border spinner-border-sm me-2" role="status"></span>}
          <span>Sign In to CRM</span>
        </button>
      </form>

      {/* Quick Demo Logins for Project Evaluator */}
      <div className="mt-4 pt-3 border-top">
        <div className="small text-muted fw-semibold mb-2 text-center text-uppercase" style={{ fontSize: "0.75rem" }}>
          Quick Demo Credentials
        </div>
        <div className="d-grid gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm py-1 text-start d-flex justify-content-between"
            onClick={() => handlePreFill("admin@acxiomcrm.com", "Admin@12345!")}
          >
            <span><strong>Admin:</strong> admin@acxiomcrm.com</span>
            <span className="badge bg-danger">Full Access</span>
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm py-1 text-start d-flex justify-content-between"
            onClick={() => handlePreFill("manager@acxiomcrm.com", "Manager@12345!")}
          >
            <span><strong>Manager:</strong> manager@acxiomcrm.com</span>
            <span className="badge bg-primary">Team Scope</span>
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm py-1 text-start d-flex justify-content-between"
            onClick={() => handlePreFill("alex.sales@acxiomcrm.com", "Sales@12345!")}
          >
            <span><strong>Sales Exec:</strong> alex.sales@acxiomcrm.com</span>
            <span className="badge bg-success">Assigned Scope</span>
          </button>
        </div>
      </div>

      <div className="text-center mt-4 pt-2">
        <span className="text-muted small">Don't have an account? </span>
        <Link to="/register" className="small fw-semibold text-primary text-decoration-none">
          Register Sales Account
        </Link>
      </div>
    </div>
  );
}
