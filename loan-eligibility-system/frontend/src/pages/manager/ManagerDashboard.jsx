import React, { useEffect, useState } from "react";
import DashboardHeader from "../../components/DashboardHeader";
import apiClient from "../../services/apiClient";
import { STATUS_LABELS, STATUS_COLORS, LOAN_TYPE_LABELS } from "../../utils/statusLabels";

const NAV_LINKS = [
  { to: "/manager/dashboard", label: "Branch Dashboard" },
];

export default function ManagerDashboard() {
  const [managerProfile, setManagerProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Review Modal State
  const [selectedApp, setSelectedApp] = useState(null);
  const [appDetails, setAppDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [decision, setDecision] = useState("APPROVE");
  const [remarks, setRemarks] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionSuccess, setDecisionSuccess] = useState("");

  // PDF Preview State
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const fetchApplications = async () => {
    try {
      const [profRes, appsRes] = await Promise.all([
        apiClient.get("/api/manager/me"),
        apiClient.get("/api/manager/applications"),
      ]);
      setManagerProfile(profRes.data);
      setApplications(appsRes.data);
    } catch (err) {
      console.error("Failed to load manager dashboard:", err);
      setError("Failed to load branch applications. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const openReviewModal = async (app) => {
    setSelectedApp(app);
    setLoadingDetails(true);
    setDecisionSuccess("");
    setDecision("APPROVE");
    setRemarks("");
    try {
      const res = await apiClient.get(`/api/manager/applications/${app.id}`);
      setAppDetails(res.data);
    } catch (err) {
      console.error("Failed to load application details:", err);
      alert("Could not load full application details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeReviewModal = () => {
    setSelectedApp(null);
    setAppDetails(null);
    if (pdfBlobUrl) {
      window.URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  };

  const handleOpenPdf = async (appId) => {
    setLoadingPdf(true);
    try {
      const res = await apiClient.get(`/api/manager/applications/${appId}/report?inline=true`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setShowPdfModal(true);
    } catch (err) {
      console.error("Failed to load PDF report:", err);
      alert("Could not load report preview.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleDownloadPdf = async (app) => {
    try {
      const res = await apiClient.get(`/api/manager/applications/${app.id}/report`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Loan_Report_${app.application_code}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Could not download report.");
    }
  };

  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    setSubmittingDecision(true);
    try {
      const res = await apiClient.post(`/api/manager/applications/${selectedApp.id}/decision`, {
        decision,
        remarks: remarks || `Manager decision: ${decision}`,
      });
      setDecisionSuccess(res.data.message || `Application updated to ${res.data.status}`);
      // Refresh branch applications
      await fetchApplications();
      setTimeout(() => {
        closeReviewModal();
      }, 1500);
    } catch (err) {
      console.error("Failed to submit decision:", err);
      alert(err?.response?.data?.detail || "Could not submit decision.");
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Stats calculation
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "SUBMITTED_TO_BRANCH" || a.status === "MANAGER_VERIFICATION" || a.status === "DOCUMENTS_UPLOADED").length,
    approved: applications.filter((a) => a.status === "APPROVED" || a.status === "FINAL_BANK_PROCESSING").length,
    rejected: applications.filter((a) => a.status === "REJECTED").length,
    corrections: applications.filter((a) => a.status === "CORRECTION_REQUIRED").length,
  };

  return (
    <div>
      <DashboardHeader links={NAV_LINKS} initials={managerProfile?.full_name?.charAt(0) || "M"} />

      <div className="dash-hero">
        <div className="dash-hero-inner">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.75rem" }}>🏛️</span>
                <h1 style={{ margin: 0 }}>
                  {managerProfile ? `${managerProfile.branch_name} — Manager Portal` : "Branch Manager Dashboard"}
                </h1>
              </div>
              <p style={{ marginTop: "0.35rem", color: "#94a3b8" }}>
                Logged in as <strong>{managerProfile?.full_name || "Manager"}</strong> ({managerProfile?.employee_code || "EMP"}) &middot; Branch Location: {managerProfile?.branch_city || "Main"}
              </p>
            </div>

            <span
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "20px",
                background: "rgba(16, 185, 129, 0.2)",
                color: "#10b981",
                border: "1px solid #10b981",
                fontWeight: 600,
                fontSize: "0.85rem",
              }}
            >
              ● Branch Authorization Active
            </span>
          </div>

          <div className="stat-grid" style={{ marginTop: "1.5rem" }}>
            <div className="stat-card">
              <div className="stat-label">Total Assigned</div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Review</div>
              <div className="stat-value" style={{ color: "#f59e0b" }}>{stats.pending}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Approved</div>
              <div className="stat-value" style={{ color: "#10b981" }}>{stats.approved}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Rejected / Correction</div>
              <div className="stat-value" style={{ color: "#ef4444" }}>{stats.rejected + stats.corrections}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-content" style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ margin: 0 }}>Applications Mapped to This Branch</h2>
          <button onClick={fetchApplications} className="btn-secondary" style={{ fontSize: "0.85rem" }}>
            🔄 Refresh List
          </button>
        </div>

        {error && <div className="card" style={{ borderLeft: "5px solid crimson" }}><p style={{ color: "crimson" }}>{error}</p></div>}

        {loading ? (
          <div className="card"><p>Loading branch loan applications...</p></div>
        ) : applications.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
            <h3>No Applications Pending for This Branch</h3>
            <p style={{ color: "var(--text-muted)" }}>
              When applicants select <strong>{managerProfile?.branch_name || "this branch"}</strong> during submission, their AI-verified applications will appear here automatically.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {applications.map((app) => {
              const ai = app.ai_prediction || {};
              const isFlagged = ai.risk_level === "HIGH" || ai.eligibility === "NEEDS_REVIEW";
              return (
                <div
                  key={app.id}
                  className="card"
                  style={{
                    borderLeft: `5px solid ${STATUS_COLORS[app.status] || "var(--ink-500)"}`,
                    padding: "1.25rem",
                    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "1.15rem", color: "var(--ink-900)" }}>
                          {app.application_code}
                        </span>
                        <span
                          style={{
                            padding: "0.15rem 0.55rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            backgroundColor: `${STATUS_COLORS[app.status] || "#0284c7"}15`,
                            color: STATUS_COLORS[app.status] || "#0284c7",
                            border: `1px solid ${STATUS_COLORS[app.status] || "#0284c7"}35`,
                          }}
                        >
                          {STATUS_LABELS[app.status] || app.status}
                        </span>

                        {isFlagged ? (
                          <span style={{ padding: "0.15rem 0.5rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700, background: "#fee2e2", color: "#991b1b" }}>
                            ⚠️ Flagged / High Risk
                          </span>
                        ) : (
                          <span style={{ padding: "0.15rem 0.5rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700, background: "#ecfdf5", color: "#065f46" }}>
                            🤖 AI Verified
                          </span>
                        )}
                      </div>

                      <div style={{ marginTop: "0.35rem", fontSize: "0.95rem" }}>
                        <strong>{app.applicant_name}</strong> &middot; {LOAN_TYPE_LABELS[app.loan_type] || app.loan_type} &middot; <strong style={{ color: "#0369a1" }}>₹{Number(app.requested_amount).toLocaleString("en-IN")}</strong> ({app.loan_tenure_months} mo)
                      </div>

                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        Applicant: {app.applicant_email || "N/A"} &middot; {app.applicant_phone || "N/A"} &middot; Date: {app.created_at ? new Date(app.created_at).toLocaleDateString("en-IN") : "N/A"}
                      </div>

                      {ai.reasoning && (
                        <div style={{ fontSize: "0.85rem", color: isFlagged ? "#b91c1c" : "var(--ink-700)", marginTop: "0.4rem", background: isFlagged ? "#fff1f2" : "#f8fafc", padding: "0.35rem 0.65rem", borderRadius: "4px" }}>
                          <strong>AI Assessment:</strong> {ai.reasoning}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleDownloadPdf(app)}
                        style={{ fontSize: "0.85rem", padding: "0.5rem 0.85rem" }}
                      >
                        📥 PDF
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => openReviewModal(app)}
                        style={{ fontSize: "0.85rem", padding: "0.5rem 1rem", background: "#0284c7", borderColor: "#0284c7" }}
                      >
                        Review &amp; Verify →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manager Review Modal */}
      {selectedApp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={closeReviewModal}
        >
          <div
            style={{
              width: "94vw",
              maxWidth: "1000px",
              maxHeight: "92vh",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1rem 1.5rem",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "#fff" }}>
                  Review Application: {selectedApp.application_code}
                </h3>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  Applicant: {selectedApp.applicant_name} &middot; Loan: {selectedApp.loan_type} &middot; Amount: ₹{Number(selectedApp.requested_amount).toLocaleString("en-IN")}
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleOpenPdf(selectedApp.id)}
                  disabled={loadingPdf}
                  style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", background: "#0284c7", border: "none" }}
                >
                  <span>{loadingPdf ? "⏳" : "📄"}</span>
                  <span>View PDF Report</span>
                </button>
                <button
                  type="button"
                  onClick={closeReviewModal}
                  style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    border: "none",
                    color: "#fff",
                    borderRadius: "6px",
                    padding: "0.4rem 0.75rem",
                    cursor: "pointer",
                    fontSize: "1rem",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {loadingDetails ? (
                <p>Loading application and verification details...</p>
              ) : appDetails ? (
                <>
                  {/* Status Banner */}
                  <div style={{ padding: "0.75rem 1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Current Application Status:</span>
                      <div style={{ fontWeight: 700, color: STATUS_COLORS[appDetails.status] || "#0284c7", fontSize: "1.05rem" }}>
                        {STATUS_LABELS[appDetails.status] || appDetails.status}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>AI Eligibility Confidence:</span>
                      <div style={{ fontWeight: 700, fontSize: "1.05rem", color: appDetails.ai_prediction?.score >= 60 ? "var(--success)" : "#b45309" }}>
                        {appDetails.ai_prediction?.score || 50}% ({appDetails.ai_prediction?.risk_level || "MEDIUM"} Risk)
                      </div>
                    </div>
                  </div>

                  {/* AI Prediction & Reason */}
                  <div style={{ padding: "0.85rem 1rem", background: appDetails.ai_prediction?.risk_level === "HIGH" ? "#fef2f2" : "#f0fdf4", border: `1px solid ${appDetails.ai_prediction?.risk_level === "HIGH" ? "#fecaca" : "#bbf7d0"}`, borderRadius: "8px" }}>
                    <h4 style={{ margin: "0 0 0.35rem 0", color: appDetails.ai_prediction?.risk_level === "HIGH" ? "#991b1b" : "#166534" }}>
                      🤖 AI Automated Screening Details
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: appDetails.ai_prediction?.risk_level === "HIGH" ? "#7f1d1d" : "#14532d" }}>
                      {appDetails.ai_prediction?.reasoning}
                    </p>
                  </div>

                  {/* OCR & Cross-Document Verification Matrix */}
                  <div>
                    <h4 style={{ margin: "0 0 0.5rem 0" }}>🔍 Document OCR Field Cross-Verification Matrix</h4>
                    {appDetails.verifications?.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No document verification rows extracted.</p>
                    ) : (
                      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                          <thead>
                            <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                              <th style={{ padding: "0.6rem 0.85rem" }}>Verification Parameter</th>
                              <th style={{ padding: "0.6rem 0.85rem" }}>Entered in Form</th>
                              <th style={{ padding: "0.6rem 0.85rem" }}>OCR Extracted from Document</th>
                              <th style={{ padding: "0.6rem 0.85rem" }}>Match Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {appDetails.verifications?.map((v, i) => {
                              const isConsistent = v.match_status === "CONSISTENT";
                              return (
                                <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: isConsistent ? "#fff" : "#fffbeb" }}>
                                  <td style={{ padding: "0.6rem 0.85rem", fontWeight: 600 }}>{v.field_name}</td>
                                  <td style={{ padding: "0.6rem 0.85rem" }}>{v.entered_value || "N/A"}</td>
                                  <td style={{ padding: "0.6rem 0.85rem", color: isConsistent ? "var(--ink-800)" : "#b45309" }}>{v.extracted_value || "N/A"}</td>
                                  <td style={{ padding: "0.6rem 0.85rem" }}>
                                    <span
                                      style={{
                                        padding: "0.15rem 0.5rem",
                                        borderRadius: "10px",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        background: isConsistent ? "#ecfdf5" : "#fee2e2",
                                        color: isConsistent ? "#065f46" : "#991b1b",
                                      }}
                                    >
                                      {v.match_status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Uploaded Documents List */}
                  <div>
                    <h4 style={{ margin: "0 0 0.5rem 0" }}>📁 Uploaded Document Proofs ({appDetails.documents?.length || 0})</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                      {appDetails.documents?.map((doc) => (
                        <div key={doc.id} style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "#f8fafc" }}>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            📄 {doc.filename}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                            Type: {doc.document_type} &middot; Confidence: {doc.ocr_confidence}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Decision Submission Form */}
                  <div style={{ marginTop: "0.5rem", padding: "1.25rem", background: "#f1f5f9", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <h4 style={{ margin: "0 0 0.75rem 0" }}>✍️ Submit Branch Manager Verification Decision</h4>

                    {decisionSuccess && (
                      <div style={{ padding: "0.75rem", background: "#dcfce7", color: "#15803d", borderRadius: "6px", marginBottom: "1rem", fontWeight: 600 }}>
                        ✓ {decisionSuccess}
                      </div>
                    )}

                    <form onSubmit={handleSubmitDecision}>
                      <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.9rem" }}>
                          Verification Action:
                        </label>
                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontWeight: decision === "APPROVE" ? 700 : 400, color: decision === "APPROVE" ? "#166534" : "inherit" }}>
                            <input
                              type="radio"
                              name="decision"
                              value="APPROVE"
                              checked={decision === "APPROVE"}
                              onChange={(e) => setDecision(e.target.value)}
                            />
                            ✅ Approve Application
                          </label>

                          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontWeight: decision === "REJECT" ? 700 : 400, color: decision === "REJECT" ? "#991b1b" : "inherit" }}>
                            <input
                              type="radio"
                              name="decision"
                              value="REJECT"
                              checked={decision === "REJECT"}
                              onChange={(e) => setDecision(e.target.value)}
                            />
                            ❌ Reject Application
                          </label>

                          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontWeight: decision === "REQUEST_CORRECTION" ? 700 : 400, color: decision === "REQUEST_CORRECTION" ? "#92400e" : "inherit" }}>
                            <input
                              type="radio"
                              name="decision"
                              value="REQUEST_CORRECTION"
                              checked={decision === "REQUEST_CORRECTION"}
                              onChange={(e) => setDecision(e.target.value)}
                            />
                            ⚠️ Request Document Correction
                          </label>
                        </div>
                      </div>

                      <div style={{ marginBottom: "1rem" }}>
                        <label htmlFor="manager_remarks" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, fontSize: "0.9rem" }}>
                          Manager Review Remarks &amp; Notes:
                        </label>
                        <textarea
                          id="manager_remarks"
                          rows="3"
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="e.g. Identity and documents verified against branch records. Approved for disbursement."
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            fontSize: "0.9rem",
                            resize: "vertical",
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                        <button type="button" className="btn-secondary" onClick={closeReviewModal}>
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingDecision}
                          className="btn"
                          style={{
                            backgroundColor: decision === "APPROVE" ? "#16a34a" : decision === "REJECT" ? "#dc2626" : "#d97706",
                            borderColor: decision === "APPROVE" ? "#16a34a" : decision === "REJECT" ? "#dc2626" : "#d97706",
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          {submittingDecision ? "Submitting..." : `Submit Decision (${decision})`}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowPdfModal(false)}
        >
          <div
            style={{
              width: "92vw",
              maxWidth: "1050px",
              height: "90vh",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "0.85rem 1.25rem",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.4rem" }}>📄</span>
                <span style={{ fontWeight: 700 }}>
                  Application Report — {selectedApp?.application_code}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "6px",
                  padding: "0.45rem 0.75rem",
                  fontSize: "1rem",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ✕ Close
              </button>
            </div>
            <div style={{ flex: 1, background: "#f1f5f9" }}>
              {pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  title="Loan Application Report"
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  <p>Loading PDF preview...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
