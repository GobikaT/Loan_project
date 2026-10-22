import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMyApplications } from "../../services/applicationService";
import apiClient from "../../services/apiClient";
import { STATUS_LABELS, STATUS_COLORS, LOAN_TYPE_LABELS } from "../../utils/statusLabels";

export default function ApplicationTracking() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // PDF Preview Modal State
  const [activePdfApp, setActivePdfApp] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setApplications(await listMyApplications());
      } catch (err) {
        setError("Could not load your applications.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleOpenPdf = async (app) => {
    setActivePdfApp(app);
    setLoadingPdf(true);
    setPdfBlobUrl(null);
    try {
      const response = await apiClient.get(`/api/applicant/applications/${app.id}/report?inline=true`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch (err) {
      console.error("Failed to load PDF:", err);
      alert("Could not load the PDF report preview. Please try downloading directly.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleDownloadPdf = async (app) => {
    setDownloadingId(app.id);
    try {
      const response = await apiClient.get(`/api/applicant/applications/${app.id}/report`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Loan_Report_${app.application_code || app.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Could not download the report. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const closePdfModal = () => {
    setActivePdfApp(null);
    if (pdfBlobUrl) {
      window.URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  };

  return (
    <div className="page" style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Track Loan Applications</h1>
          <p style={{ color: "var(--text-muted)", marginTop: "0.25rem", fontSize: "0.95rem" }}>
            Real-time status tracking with automated AI verification and branch manager assignment.
          </p>
        </div>
        <Link to="/applicant/loan-selection" className="btn" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <span>+</span>
          <span>Apply for New Loan</span>
        </Link>
      </div>

      {loading && <div className="card"><p>Loading application details...</p></div>}
      {error && <div className="card" style={{ borderLeft: "5px solid crimson" }}><p style={{ color: "crimson" }}>{error}</p></div>}
      
      {!loading && applications.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📂</div>
          <h3>No Applications Found</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            You haven't submitted any loan applications yet. Start your fast AI-powered application now.
          </p>
          <Link className="btn" to="/applicant/loan-selection">
            Apply Now
          </Link>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {applications.map((app) => {
          const isAiVerified = app.status === "SUBMITTED_TO_BRANCH" || app.status === "APPROVED" || app.status === "MANAGER_VERIFICATION";
          return (
            <div
              key={app.id}
              className="card"
              style={{
                borderLeft: `6px solid ${STATUS_COLORS[app.status] || "var(--ink-500)"}`,
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: "1.3rem" }}>{app.application_code}</h2>
                    {isAiVerified && (
                      <span
                        style={{
                          padding: "0.2rem 0.6rem",
                          borderRadius: "20px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          backgroundColor: "#f0fdf4",
                          color: "#166534",
                          border: "1px solid #bbf7d0",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                        }}
                      >
                        <span>🤖</span>
                        <span>AI Verified</span>
                      </span>
                    )}

                    <span
                      style={{
                        padding: "0.2rem 0.65rem",
                        borderRadius: "20px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        backgroundColor: `${STATUS_COLORS[app.status] || "#0284c7"}15`,
                        color: STATUS_COLORS[app.status] || "#0284c7",
                        border: `1px solid ${STATUS_COLORS[app.status] || "#0284c7"}40`,
                      }}
                    >
                      {STATUS_LABELS[app.status] || app.status}
                    </span>
                  </div>

                  <p style={{ margin: "0.4rem 0 0 0", color: "var(--text-muted)", fontSize: "0.95rem" }}>
                    {LOAN_TYPE_LABELS[app.loan_type] || app.loan_type} &middot; Requested: <strong style={{ color: "var(--ink-900)" }}>₹{Number(app.requested_amount).toLocaleString("en-IN")}</strong> for {app.loan_tenure_months} months
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleOpenPdf(app)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.85rem",
                      padding: "0.5rem 0.9rem",
                      background: "#0284c7",
                      borderColor: "#0284c7",
                    }}
                  >
                    <span>👁️</span>
                    <span>Touch to View PDF</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleDownloadPdf(app)}
                    disabled={downloadingId === app.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.85rem",
                      padding: "0.5rem 0.9rem",
                    }}
                  >
                    <span>{downloadingId === app.id ? "⏳" : "📥"}</span>
                    <span>Download Report</span>
                  </button>
                </div>
              </div>

              {/* Branch & Manager Details Strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "0.75rem",
                  padding: "0.85rem",
                  backgroundColor: "#f8fafc",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  fontSize: "0.9rem",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    🏛️ Assigned Branch
                  </div>
                  <div style={{ fontWeight: 600, color: "var(--ink-900)", marginTop: "0.2rem" }}>
                    {app.branch_name || "Main Branch"} {app.branch_city ? `(${app.branch_city})` : ""}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    👤 Branch Manager
                  </div>
                  <div style={{ fontWeight: 600, color: "#0369a1", marginTop: "0.2rem" }}>
                    {app.assigned_manager_name || "Assigned Manager"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    📅 Submitted Date
                  </div>
                  <div style={{ color: "var(--ink-700)", marginTop: "0.2rem" }}>
                    {app.created_at ? new Date(app.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    🔍 AI Eligibility Assessment
                  </div>
                  <div style={{ fontWeight: 600, marginTop: "0.2rem", color: app.ai_eligibility === "ELIGIBLE" ? "var(--success)" : "#b45309" }}>
                    {app.ai_eligibility || "VERIFIED"} {app.ai_probability ? `(${(app.ai_probability * 100).toFixed(0)}%)` : ""}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Touch-to-Open PDF Preview Modal */}
      {activePdfApp && (
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
          onClick={closePdfModal}
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
            {/* Modal Header */}
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
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                    Loan Application Report — {activePdfApp.application_code}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    Status: AI Verified &middot; Assigned to {activePdfApp.branch_name || "Branch"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(activePdfApp)}
                  disabled={downloadingId === activePdfApp.id}
                  style={{
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.45rem 0.9rem",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <span>📥</span>
                  <span>{downloadingId === activePdfApp.id ? "Downloading..." : "Download PDF"}</span>
                </button>
                <button
                  type="button"
                  onClick={closePdfModal}
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
                  title="Close PDF Preview"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Modal Body with PDF iframe */}
            <div style={{ flex: 1, background: "#f1f5f9", position: "relative" }}>
              {loadingPdf ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ fontSize: "2rem" }}>⏳</div>
                  <p style={{ color: "var(--text-muted)" }}>Loading official report preview...</p>
                </div>
              ) : pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  title="Loan Application Report"
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  <p>Unable to load PDF preview. Please use Download Report.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
