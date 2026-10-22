import React, { useState, useEffect } from "react";
import { listMyApplications } from "../../services/applicationService";
import apiClient from "../../services/apiClient";

export default function PDFReport() {
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const apps = await listMyApplications();
        setApplications(apps);
        if (apps.length > 0) {
          setSelectedAppId(String(apps[0].id));
        }
      } catch (err) {
        setError("Could not load applications.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDownload = async (appId) => {
    const idToUse = appId || selectedAppId;
    if (!idToUse) return;
    setDownloading(true);
    setError("");
    try {
      const response = await apiClient.get(`/api/applicant/applications/${idToUse}/report`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Loan_Report_${idToUse}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF Download error:", err);
      setError("Failed to download PDF report. Ensure application has been processed.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="page">
      <h1>Application PDF Reports</h1>
      <p>Download official generated PDF reports containing verified application details and AI underwriting analysis.</p>

      {loading && <p>Loading applications...</p>}

      {!loading && applications.length === 0 && (
        <div className="card">
          <p>No loan applications found. Please submit an application to generate reports.</p>
        </div>
      )}

      {!loading && applications.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {applications.map((app) => (
              <div
                key={app.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem",
                  background: "var(--surface-muted)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink-900)" }}>
                    {app.application_code} &bull; {app.loan_type}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Requested: ₹{Number(app.requested_amount).toLocaleString("en-IN")} &middot; Status: {app.status}
                  </div>
                </div>

                <button
                  className="btn"
                  onClick={() => handleDownload(app.id)}
                  disabled={downloading}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <span>📥</span>
                  <span>{downloading ? "Downloading..." : "Download Official PDF"}</span>
                </button>
              </div>
            ))}
          </div>

          {error && <p className="error-text" style={{ marginTop: "1rem" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
