import React from "react";

export default function DocumentUploadNotice({ documents = [] }) {
  return (
    <>
      <div className="form-section-title">Required Documents</div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
        {documents.map((d) => (
          <div key={d}>• {d}</div>
        ))}
      </div>
      <div className="warning-box">
        Document upload and automated verification will be available once this application
        reaches that stage. For now, you can submit your application details below.
      </div>
    </>
  );
}
