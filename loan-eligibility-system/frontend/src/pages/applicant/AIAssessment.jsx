import React, { useState, useEffect } from "react";
import { listMyApplications, getAiPrediction, getRiskAssessment } from "../../services/applicationService";

export default function AIAssessment() {
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [risk, setRisk] = useState(null);
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
          loadDetails(apps[0].id);
        }
      } catch (err) {
        setError("Could not load applications.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadDetails = async (appId) => {
    setFetching(true);
    setError("");
    try {
      const [aiData, riskData] = await Promise.all([
        getAiPrediction(appId),
        getRiskAssessment(appId),
      ]);
      setPrediction(aiData);
      setRisk(riskData);
    } catch (err) {
      console.error("AI fetch error", err);
      setError("Failed to fetch AI assessment for this application.");
    } finally {
      setFetching(false);
    }
  };

  const handleSelectChange = (e) => {
    const id = e.target.value;
    setSelectedAppId(id);
    if (id) loadDetails(Number(id));
  };

  return (
    <div className="page">
      <h1>AI Eligibility &amp; Risk Assessment</h1>
      <p>Automated machine learning model evaluations for your submitted loan applications.</p>

      {loading && <p>Loading applications...</p>}

      {!loading && applications.length === 0 && (
        <div className="card">
          <p>No loan applications found. Please create an application first.</p>
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
                  {app.application_code} &mdash; {app.loan_type} (₹{Number(app.requested_amount).toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>

          {fetching && <p>Loading AI evaluation data...</p>}
          {error && <p className="error-text">{error}</p>}

          {!fetching && prediction && (
            <div className="card" style={{ borderLeft: "5px solid #2563eb" }}>
              <h2>AI Evaluation Summary</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                  marginTop: "1rem",
                  background: "#f0f7ff",
                  padding: "1rem",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#1e40af", fontWeight: 600 }}>ELIGIBILITY</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: prediction.eligible ? "var(--success)" : "var(--danger)" }}>
                    {prediction.eligible ? "✔ LIKELY ELIGIBLE" : "⚠ REVIEW NEEDED"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#1e40af", fontWeight: 600 }}>CONFIDENCE</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--ink-900)" }}>
                    {prediction.confidence || 85}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#1e40af", fontWeight: 600 }}>ASSESSED RISK</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: prediction.risk_level === "LOW" ? "var(--success)" : "var(--warning)" }}>
                    {prediction.risk_level || "LOW"} RISK
                  </div>
                </div>
              </div>

              {prediction.reasoning && (
                <p style={{ marginTop: "1rem", color: "var(--text)" }}>
                  <strong>Key Observations:</strong> {prediction.reasoning}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
