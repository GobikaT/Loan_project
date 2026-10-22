import React, { useState, useEffect, useRef } from "react";
import { listMyApplications, uploadApplicationDocuments } from "../../services/applicationService";
import OCRVerificationReport from "../../components/OCRVerificationReport";

const STANDARD_DOCUMENT_SLOTS = [
  { key: "id_proof", label: "1. Identity Proof", hint: "Aadhaar Card, PAN Card, or Passport" },
  { key: "income_proof", label: "2. Income Proof", hint: "Salary Slip (Last 3 Months), Form 16, or ITR" },
  { key: "bank_statement", label: "3. Bank Statement", hint: "Last 3–6 Months Bank Account Statement" },
  { key: "address_proof", label: "4. Address / Property / Academic Proof", hint: "Utility Bill, Admission Letter, Property Agreement, etc." },
];

export default function DocumentUpload() {
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [docMap, setDocMap] = useState({});
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const fileInputRefs = useRef({});
  const additionalInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const apps = await listMyApplications();
        setApplications(apps);
        if (apps.length > 0) {
          setSelectedAppId(String(apps[0].id));
        }
      } catch (err) {
        setError("Could not load your applications.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDocFileChange = (slotKey, file) => {
    if (!file) return;
    setDocMap((prev) => ({
      ...prev,
      [slotKey]: file,
    }));
  };

  const handleRemoveDoc = (slotKey) => {
    setDocMap((prev) => {
      const copy = { ...prev };
      delete copy[slotKey];
      return copy;
    });
    if (fileInputRefs.current[slotKey]) {
      fileInputRefs.current[slotKey].value = "";
    }
  };

  const handleAdditionalChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAdditionalFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveAdditional = (idx) => {
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== idx));
    if (additionalInputRef.current) {
      additionalInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allFilesToUpload = [
    ...Object.values(docMap).filter(Boolean),
    ...additionalFiles,
  ];

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedAppId) {
      setError("Please select a loan application first.");
      return;
    }
    if (allFilesToUpload.length === 0) {
      setError("Please choose at least one document to upload.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const data = await uploadApplicationDocuments(Number(selectedAppId), allFilesToUpload);
      setResult(data);
    } catch (err) {
      console.error("Upload error:", err);
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to upload and verify documents.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="page">
        <h1>Document Verification Results</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Documents successfully uploaded and verified against the application record.
        </p>
        <OCRVerificationReport result={result} />
        <div style={{ marginTop: "1.5rem" }}>
          <button
            className="btn-secondary"
            onClick={() => {
              setResult(null);
              setDocMap({});
              setAdditionalFiles([]);
            }}
          >
            Upload More Documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Supporting Document Verification</h1>
      <p>Attach required documents individually for automated verification and evaluation.</p>

      {loading && <p>Loading your applications...</p>}

      {!loading && applications.length === 0 && (
        <div className="card">
          <p>You do not have any active applications to upload documents for.</p>
          <a href="/applicant/education-loan" className="btn" style={{ display: "inline-block", marginTop: "0.5rem" }}>
            Create an Application
          </a>
        </div>
      )}

      {!loading && applications.length > 0 && (
        <div className="card">
          <form onSubmit={handleUpload}>
            <div className="form-section-title">1. Select Target Application</div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="app_select" style={{ fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                Select Application
              </label>
              <select
                id="app_select"
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  fontSize: "0.95rem",
                }}
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.application_code} &mdash; {app.loan_type} (₹{Number(app.requested_amount).toLocaleString("en-IN")}) - {app.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>2. Upload Documents by Category</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 500, color: allFilesToUpload.length > 0 ? "var(--success)" : "var(--text-muted)" }}>
                {allFilesToUpload.length > 0 ? `✓ ${allFilesToUpload.length} file(s) selected` : "Supported: PDF, PNG, JPG, JPEG"}
              </span>
            </div>

            {/* Document Slots Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              {STANDARD_DOCUMENT_SLOTS.map((slot) => {
                const uploadedFile = docMap[slot.key];
                const isUploaded = !!uploadedFile;

                return (
                  <div
                    key={slot.key}
                    style={{
                      background: isUploaded ? "#f0fdf4" : "var(--surface)",
                      border: isUploaded ? "1.5px solid #86efac" : "1.5px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                        <strong style={{ fontSize: "0.92rem", color: "var(--ink-900)" }}>{slot.label}</strong>
                        {isUploaded && (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: "#065f46",
                              background: "#d1fae5",
                              padding: "0.15rem 0.5rem",
                              borderRadius: "12px",
                            }}
                          >
                            ✓ Ready
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{slot.hint}</div>
                    </div>

                    <input
                      ref={(el) => (fileInputRefs.current[slot.key] = el)}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.bmp,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleDocFileChange(slot.key, e.target.files[0]);
                        }
                      }}
                      style={{ display: "none" }}
                    />

                    {isUploaded ? (
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #bbf7d0",
                          borderRadius: "var(--radius-sm)",
                          padding: "0.5rem 0.75rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", overflow: "hidden" }}>
                          <span>📄</span>
                          <div style={{ overflow: "hidden" }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: "0.82rem",
                                color: "var(--ink-900)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "160px",
                              }}
                              title={uploadedFile.name}
                            >
                              {uploadedFile.name}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {formatFileSize(uploadedFile.size)}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[slot.key] && fileInputRefs.current[slot.key].click()}
                            style={{
                              background: "none",
                              border: "1px solid #cbd5e1",
                              borderRadius: "4px",
                              padding: "0.2rem 0.45rem",
                              fontSize: "0.72rem",
                              cursor: "pointer",
                            }}
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(slot.key)}
                            style={{
                              background: "#fee2e2",
                              border: "1px solid #fecaca",
                              borderRadius: "4px",
                              padding: "0.2rem 0.45rem",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              color: "#991b1b",
                              cursor: "pointer",
                            }}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[slot.key] && fileInputRefs.current[slot.key].click()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                          padding: "0.6rem 0.75rem",
                          background: "var(--surface-muted)",
                          border: "1px dashed var(--border)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.82rem",
                          cursor: "pointer",
                        }}
                      >
                        <span>📎</span>
                        <span>Choose Document</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Additional Files */}
            <div style={{ background: "var(--surface-muted)", padding: "0.85rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--ink-900)" }}>
                    Additional Documents (Optional)
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    Attach any extra files or certificates
                  </div>
                </div>
                <input
                  ref={additionalInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.bmp,.txt"
                  onChange={handleAdditionalChange}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  onClick={() => additionalInputRef.current && additionalInputRef.current.click()}
                  style={{
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    background: "#ffffff",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  + Add Extra File
                </button>
              </div>

              {additionalFiles.length > 0 && (
                <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {additionalFiles.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#ffffff",
                        padding: "0.35rem 0.6rem",
                        borderRadius: "4px",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ fontSize: "0.8rem", color: "var(--ink-900)" }}>
                        📑 {file.name} ({formatFileSize(file.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAdditional(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--danger)",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="error-text" style={{ marginTop: "1rem" }}>{error}</p>}

            <button
              type="submit"
              disabled={submitting || allFilesToUpload.length === 0}
              style={{ marginTop: "1rem", width: "100%", padding: "0.85rem", fontWeight: 600 }}
            >
              {submitting ? "Verifying & Analyzing Documents..." : `Upload & Verify ${allFilesToUpload.length > 0 ? `(${allFilesToUpload.length} Documents)` : ""}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
