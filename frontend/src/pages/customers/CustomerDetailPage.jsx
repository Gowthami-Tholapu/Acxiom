import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import LoadingSpinner from "../../components/LoadingSpinner";
import { formatCurrency, formatDate, formatDateTime, getStatusBadgeClass } from "../../utils/formatters";
import CustomerFormModal from "./CustomerFormModal";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  async function fetchCustomerDetails() {
    setLoading(true);
    setError(null);
    try {
      const custRes = await api.get(`/customers/${id}`);
      setCustomer(custRes.data);

      // Fetch related CRM objects
      const [oppRes, fuRes, actRes] = await Promise.all([
        api.get(`/opportunities?customer_id=${id}&page_size=100`),
        api.get(`/followups?page_size=100`),
        api.get(`/activities?customer_id=${id}&page_size=100`),
      ]);

      setOpportunities(oppRes.data.items || []);
      // Filter followups for this customer
      setFollowUps((fuRes.data.items || []).filter((f) => f.customer_id === Number(id)));
      setActivities(actRes.data.items || []);
    } catch (err) {
      setError(err.userMessage || "Failed to load customer details.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading customer account details..." />;
  }

  if (error || !customer) {
    return (
      <div className="container py-5 text-center">
        <AlertBanner type="danger" message={error || "Customer record could not be loaded."} />
        <Link to="/customers" className="btn btn-outline-secondary mt-3">
          &larr; Back to Customers
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header breadcrumb & actions */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <div className="small text-muted mb-1">
            <Link to="/customers" className="text-decoration-none text-muted">Customers</Link> &gt; <span>{customer.customer_code}</span>
          </div>
          <h3 className="fw-bold text-dark mb-0">
            {customer.customer_name}{" "}
            <span className={getStatusBadgeClass(customer.status)} style={{ fontSize: "0.8rem", verticalAlign: "middle" }}>
              {customer.status}
            </span>
          </h3>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={() => setEditModalOpen(true)}>
            <i className="bi bi-pencil me-1"></i> Edit Customer
          </button>
          <Link to="/customers" className="btn btn-light border">
            &larr; Back
          </Link>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="card-crm p-4 mb-4">
        <h6 className="fw-bold text-dark mb-3">Customer Information</h6>
        <div className="row g-3">
          <div className="col-sm-6 col-md-3">
            <div className="text-muted small text-uppercase fw-semibold">Customer Code</div>
            <div className="fw-bold text-primary">{customer.customer_code}</div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="text-muted small text-uppercase fw-semibold">Email</div>
            <div className="fw-semibold text-dark">{customer.email}</div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="text-muted small text-uppercase fw-semibold">Phone</div>
            <div className="fw-semibold text-dark">{customer.phone}</div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="text-muted small text-uppercase fw-semibold">Company</div>
            <div className="fw-semibold text-dark">{customer.company_name || "-"}</div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="text-muted small text-uppercase fw-semibold">Address</div>
            <div className="text-secondary">{customer.address || "-"}</div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="text-muted small text-uppercase fw-semibold">City & State</div>
            <div className="text-secondary">{customer.city ? `${customer.city}, ${customer.state || ""}` : "-"}</div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="text-muted small text-uppercase fw-semibold">Account Manager / Creator</div>
            <div className="text-dark fw-medium">{customer.creator_name || "Sales Executive"}</div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="text-muted small text-uppercase fw-semibold">Registered Since</div>
            <div className="text-secondary">{formatDate(customer.created_at)}</div>
          </div>
        </div>
      </div>

      {/* Tabs for Opportunities, Follow-ups, Activities */}
      <div className="row g-4">
        {/* Associated Opportunities */}
        <div className="col-lg-6">
          <div className="card-crm p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-briefcase-fill text-primary me-2"></i>Opportunities ({opportunities.length})
              </h6>
              <Link to="/opportunities" className="small text-primary fw-semibold text-decoration-none">
                + Add Deal
              </Link>
            </div>
            {opportunities.length === 0 ? (
              <p className="text-muted small text-center py-3">No opportunities linked to this customer.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Deal Name</th>
                      <th>Stage</th>
                      <th>Amount</th>
                      <th>Weighted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunities.map((opp) => (
                      <tr key={opp.id}>
                        <td>
                          <Link to={`/opportunities`} className="fw-semibold text-dark text-decoration-none">
                            {opp.opportunity_name}
                          </Link>
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(opp.stage)}>{opp.stage}</span>
                        </td>
                        <td className="fw-bold text-dark">{formatCurrency(opp.amount)}</td>
                        <td className="text-muted">{formatCurrency(opp.weighted_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Associated Follow-Ups */}
        <div className="col-lg-6">
          <div className="card-crm p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-calendar-check-fill text-success me-2"></i>Follow-Ups ({followUps.length})
              </h6>
              <Link to="/followups" className="small text-primary fw-semibold text-decoration-none">
                + Schedule
              </Link>
            </div>
            {followUps.length === 0 ? (
              <p className="text-muted small text-center py-3">No follow-ups recorded for this customer.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Subject</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followUps.map((fu) => (
                      <tr key={fu.id}>
                        <td className="fw-semibold text-truncate" style={{ maxWidth: "150px" }}>
                          {fu.subject}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">{fu.follow_up_type}</span>
                        </td>
                        <td className="small text-muted">{formatDateTime(fu.follow_up_date)}</td>
                        <td>
                          <span className={getStatusBadgeClass(fu.status)}>{fu.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <CustomerFormModal
        show={editModalOpen}
        customer={customer}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => fetchCustomerDetails()}
      />
    </div>
  );
}
