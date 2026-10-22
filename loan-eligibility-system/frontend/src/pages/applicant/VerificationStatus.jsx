import React, { useState, useEffect } from "react";
import { listMyApplications, getExtractedFields } from "../../services/applicationService";

export default function VerificationStatus() {
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const apps = await listMyApplications();
        setApplications(apps);
        if (apps.length > 0) {
          setSelectedAppId(String(apps[0].id));
          loadVerifications(apps[0].id);
        }
      } catch (err) {
        setError("Could not load applications.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadVerifications = async (appId) => {
    setFetching(true);
    setError("");
    try {
      const data = await getExtractedFields(appId);
      setVerificationData(data);
    } catch (err) {
      console.error("Verification fetch error", err);
      setError("Failed to fetch verification data.");
    } finally {
      setFetching(false);
    }
  };

  const handleSelectChange = (e) => {
    const id = e.target.value;
    setSelectedAppId(id);
    if (id) loadVerifications(Number(id));
  };

  return (
    <div className="page">
      <h1>Document Verification Status</h1>
      <p>Check the automated verification results and cross-match status of your submitted documents.</p>

      {loading && <p>Loading applications...</p>}

      {!loading && applications.length === 0 && (
        <div className="card">
          <p>No applications found.</p>
        </div>
      )}

      {!loading && applications.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card">
            <label htmlFor="app_select" style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
              Select Loan Application:
            </label>
            <select
              id="app_select"
              value={selectedAppId}
              onChange={handleSelectChange}
              style={{ width: "100%", padding: "0.6rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
            >
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.application_code} &mdash; {app.loan_type} ({app.status})
                </option>
              ))}
            </select>
          </div>

          {fetching && <p>Loading verification details...</p>}
          {error && <p className="error-text">{error}</p>}

          {!fetching && verificationData && (
            <>
              {/* Field Verification Table */}
              <div className="card">
                <h2>Field Cross-Verification Status</h2>
                {verificationData.verifications && verificationData.verifications.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", marginTop: "1rem" }}>
                    <thead>
                      <tr style={{ background: "var(--surface-muted)", borderBottom: "2px solid var(--border)" }}>
                        <th style={{ textAlign: "left", padding: "0.6rem" }}>Field Name</th>
                        <th style={{ textAlign: "left", padding: "0.6rem" }}>Application Value</th>
                        <th style={{ textAlign: "left", padding: "0.6rem" }}>Extracted from Document</th>
                        <th style={{ textAlign: "center", padding: "0.6rem" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verificationData.verifications.map((v, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "0.6rem", fontWeight: 600 }}>{v.field_name}</td>
                          <td style={{ padding: "0.6rem" }}>{v.entered_value || "-"}</td>
                          <td style={{ padding: "0.6rem" }}>{v.extracted_value || "-"}</td>
                          <td style={{ padding: "0.6rem", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "12px",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                background: v.match_status === "CONSISTENT" ? "#ecfdf5" : "#fffbeb",
                                color: v.match_status === "CONSISTENT" ? "#065f46" : "#92400e",
                              }}
                            >
                              {v.match_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontStyle: "italic", marginTop: "0.5rem" }}>
                    No field cross-checks available for this application yet.
                  </p>
                )}
              </div>

              {/* Uploaded Documents */}
              {verificationData.documents && verificationData.documents.length > 0 && (
                <div className="card">
                  <h2>Attached Documents ({verificationData.documents.length})</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                    {verificationData.documents.map((d, i) => (
                      <div key={i} style={{ padding: "0.85rem", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                        <div style={{ fontWeight: 600, color: "var(--ink-900)" }}>📎 {d.filename}</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                          Type: {d.document_type} &bull; Verification Match: {Math.round(d.ocr_confidence)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
