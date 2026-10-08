import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axiosClient";
import AlertBanner from "../../components/AlertBanner";
import LoadingSpinner from "../../components/LoadingSpinner";
import { formatCurrency, formatDate } from "../../utils/formatters";
import OpportunityFormModal from "./OpportunityFormModal";

const PIPELINE_STAGES = [
  { id: "Qualification", name: "Qualification", color: "#6366f1" },
  { id: "Proposal", name: "Proposal", color: "#0ea5e9" },
  { id: "Negotiation", name: "Negotiation", color: "#f59e0b" },
  { id: "Won", name: "Won", color: "#10b981" },
  { id: "Lost", name: "Lost", color: "#ef4444" },
];

export default function PipelineKanbanPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [formModalOpen, setFormModalOpen] = useState(false);

  useEffect(() => {
    fetchPipeline();
  }, []);

  async function fetchPipeline() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/opportunities?page_size=100");
      setOpportunities(res.data.items || []);
    } catch (err) {
      setError(err.userMessage || "Failed to load pipeline board.");
    } finally {
      setLoading(false);
    }
  }

  const handleAdvanceStage = async (opp, nextStage) => {
    try {
      await api.put(`/opportunities/${opp.id}`, { stage: nextStage });
      setSuccessMsg(`"${opp.opportunity_name}" moved to ${nextStage}!`);
      fetchPipeline();
    } catch (err) {
      setError(err.userMessage || "Failed to move stage.");
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">Sales Pipeline Board</h3>
          <p className="text-muted small mb-0">Visual stage-by-stage deal flow and revenue distribution.</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/opportunities" className="btn btn-outline-secondary d-flex align-items-center">
            <i className="bi bi-list-ul me-2"></i> Table View
          </Link>
          <button
            className="btn btn-primary-crm d-flex align-items-center"
            onClick={() => {
              setSelectedOpp(null);
              setFormModalOpen(true);
            }}
          >
            <i className="bi bi-plus-circle-fill me-2"></i> New Deal
          </button>
        </div>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg("")} />}
      {error && <AlertBanner type="danger" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <LoadingSpinner message="Organizing sales pipeline..." />
      ) : (
        <div className="row g-3 flex-nowrap overflow-auto pb-4" style={{ minHeight: "70vh" }}>
          {PIPELINE_STAGES.map((stage) => {
            const stageOpps = opportunities.filter((o) => o.stage === stage.id);
            const totalStageAmt = stageOpps.reduce((sum, o) => sum + o.amount, 0);

            return (
              <div key={stage.id} className="col-12 col-md-6 col-lg-4 col-xl" style={{ minWidth: "270px" }}>
                <div
                  className="card shadow-sm border-0 h-100"
                  style={{ backgroundColor: "#f8fafc", borderRadius: "12px" }}
                >
                  {/* Column Header */}
                  <div
                    className="p-3 border-bottom d-flex justify-content-between align-items-center"
                    style={{ borderTop: `4px solid ${stage.color}`, borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}
                  >
                    <div>
                      <h6 className="fw-bold mb-0 text-dark">{stage.name}</h6>
                      <div className="small text-muted fw-semibold">
                        {formatCurrency(totalStageAmt)}
                      </div>
                    </div>
                    <span className="badge rounded-pill bg-light text-dark border">
                      {stageOpps.length}
                    </span>
                  </div>

                  {/* Deals List */}
                  <div className="p-2 overflow-auto flex-grow-1" style={{ maxHeight: "68vh" }}>
                    {stageOpps.length === 0 ? (
                      <div className="text-center py-5 text-muted small">No deals in this stage</div>
                    ) : (
                      stageOpps.map((opp) => (
                        <div
                          key={opp.id}
                          className="card border shadow-xs p-3 mb-2 bg-white"
                          style={{ borderRadius: "10px", cursor: "pointer" }}
                          onClick={() => {
                            setSelectedOpp(opp);
                            setFormModalOpen(true);
                          }}
                        >
                          <div className="fw-bold text-dark text-truncate mb-1">
                            {opp.opportunity_name}
                          </div>
                          <div className="small text-primary fw-medium text-truncate mb-2">
                            {opp.customer_name}
                          </div>

                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold text-success fs-6">
                              {formatCurrency(opp.amount)}
                            </span>
                            <span className="badge bg-light text-secondary border">
                              {opp.probability}% Prob
                            </span>
                          </div>

                          <div className="d-flex justify-content-between align-items-center text-muted small pt-2 border-top">
                            <span style={{ fontSize: "0.75rem" }}>
                              <i className="bi bi-calendar3 me-1"></i> {formatDate(opp.expected_close_date)}
                            </span>
                            <span style={{ fontSize: "0.75rem" }}>
                              {opp.assigned_user_name || "Rep"}
                            </span>
                          </div>

                          {/* Quick stage transition button */}
                          {stage.id !== "Won" && stage.id !== "Lost" && (
                            <div className="mt-2 pt-2 border-top d-flex justify-content-end" onClick={(e) => e.stopPropagation()}>
                              {stage.id === "Qualification" && (
                                <button
                                  className="btn btn-outline-primary btn-xs py-0 px-2"
                                  style={{ fontSize: "0.75rem" }}
                                  onClick={() => handleAdvanceStage(opp, "Proposal")}
                                >
                                  Move to Proposal &rarr;
                                </button>
                              )}
                              {stage.id === "Proposal" && (
                                <button
                                  className="btn btn-outline-warning btn-xs py-0 px-2"
                                  style={{ fontSize: "0.75rem" }}
                                  onClick={() => handleAdvanceStage(opp, "Negotiation")}
                                >
                                  Move to Negotiation &rarr;
                                </button>
                              )}
                              {stage.id === "Negotiation" && (
                                <div className="btn-group btn-group-sm">
                                  <button
                                    className="btn btn-outline-success btn-xs py-0 px-2"
                                    style={{ fontSize: "0.75rem" }}
                                    onClick={() => handleAdvanceStage(opp, "Won")}
                                  >
                                    Mark Won &#10003;
                                  </button>
                                  <button
                                    className="btn btn-outline-danger btn-xs py-0 px-2"
                                    style={{ fontSize: "0.75rem" }}
                                    onClick={() => handleAdvanceStage(opp, "Lost")}
                                  >
                                    Lost
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <OpportunityFormModal
        show={formModalOpen}
        opportunity={selectedOpp}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg(selectedOpp ? "Deal updated successfully!" : "Deal added to pipeline!");
          fetchPipeline();
        }}
      />
    </div>
  );
}
