import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AlertBanner from "../../components/AlertBanner";
import { useAuth } from "../../context/AuthContext";
import { validateEmail, validatePassword } from "../../utils/validators";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const errors = {};
    if (!name.trim()) errors.name = "Full name is required.";
    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) errors.password = pwErr;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div>
      <h4 className="fw-bold text-dark mb-1">Create Sales Account</h4>
      <p className="text-muted small mb-3">Register your profile to access AcxiomCRM sales tools.</p>

      <div className="alert alert-info py-2 px-3 small mb-3">
        <i className="bi bi-info-circle-fill me-1"></i> New registrations default to the <strong>Sales Executive</strong> role for security.
      </div>

      {errorMsg && <AlertBanner type="danger" message={errorMsg} onClose={() => setErrorMsg("")} />}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
          {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
            placeholder="name@organization.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
        </div>

        <div className="mb-4">
          <label className="form-label">Password</label>
          <input
            type="password"
            className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
            placeholder="Min 8 chars (upper, lower, digit, special)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
          <div className="form-text" style={{ fontSize: "0.75rem" }}>
            Must contain 8+ characters, uppercase, lowercase, digit, and special character.
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary-crm w-100 py-2 d-flex align-items-center justify-content-center"
          disabled={loading}
        >
          {loading && <span className="spinner-border spinner-border-sm me-2" role="status"></span>}
          <span>Complete Registration</span>
        </button>
      </form>

      <div className="text-center mt-4 pt-2">
        <span className="text-muted small">Already have an account? </span>
        <Link to="/login" className="small fw-semibold text-primary text-decoration-none">
          Sign In
        </Link>
      </div>
    </div>
  );
}
