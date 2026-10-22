import React, { useState, useRef } from "react";

export default function DocumentAttachmentSection({
  documents = [],
  files = [],
  setFiles,
  loanType = "Loan",
}) {
  // Store uploaded files mapped by document category key
  const [docMap, setDocMap] = useState({});
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const fileInputRefs = useRef({});
  const additionalInputRef = useRef(null);

  // Sync state upward whenever docMap or additionalFiles change
  const updateParentFiles = (currentDocMap, currentAdditional) => {
    const combined = [
      ...Object.values(currentDocMap).filter(Boolean),
      ...currentAdditional,
    ];
    setFiles(combined);
  };

  const handleSingleDocChange = (docName, file) => {
    if (!file) return;
    // Retain original file with custom property or name for reference if needed
    const updatedMap = {
      ...docMap,
      [docName]: file,
    };
    setDocMap(updatedMap);
    updateParentFiles(updatedMap, additionalFiles);
  };

  const handleRemoveDoc = (docName) => {
    const updatedMap = { ...docMap };
    delete updatedMap[docName];
    setDocMap(updatedMap);
    // Reset file input element value if present
    if (fileInputRefs.current[docName]) {
      fileInputRefs.current[docName].value = "";
    }
    updateParentFiles(updatedMap, additionalFiles);
  };

  const handleAdditionalChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const updated = [...additionalFiles, ...newFiles];
      setAdditionalFiles(updated);
      updateParentFiles(docMap, updated);
    }
  };

  const handleRemoveAdditional = (index) => {
    const updated = additionalFiles.filter((_, idx) => idx !== index);
    setAdditionalFiles(updated);
    if (additionalInputRef.current) {
      additionalInputRef.current.value = "";
    }
    updateParentFiles(docMap, updated);
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalAttached =
    Object.keys(docMap).length + additionalFiles.length;

  return (
    <div style={{ marginTop: "2rem" }}>
      <div
        className="form-section-title"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "0.75rem",
        }}
      >
        <span>📁 Required Supporting Documents</span>
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 500,
            color: totalAttached > 0 ? "var(--success)" : "var(--text-muted)",
          }}
        >
          {totalAttached > 0
            ? `✓ ${totalAttached} Document${totalAttached > 1 ? "s" : ""} Attached`
            : "Upload PDF, JPG, PNG or TXT"}
        </span>
      </div>

      <p
        style={{
          fontSize: "0.88rem",
          color: "var(--text-muted)",
          marginTop: 0,
          marginBottom: "1.25rem",
        }}
      >
        Please provide the required verification documents individually below.
        Details will be verified automatically upon submitting your application.
      </p>

      {/* Individual Document Upload Fields */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        {documents.map((docName, idx) => {
          const uploadedFile = docMap[docName];
          const isUploaded = !!uploadedFile;

          return (
            <div
              key={docName || idx}
              style={{
                background: isUploaded ? "#f0fdf4" : "var(--surface)",
                border: isUploaded ? "1.5px solid #86efac" : "1.5px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "1rem 1.15rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.75rem",
                transition: "all 0.2s ease-in-out",
                boxShadow: isUploaded ? "0 2px 6px rgba(16, 185, 129, 0.08)" : "none",
              }}
            >
              {/* Field Label Header */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <label
                    style={{
                      fontWeight: 600,
                      fontSize: "0.92rem",
                      color: "var(--ink-900)",
                      marginBottom: "0.2rem",
                      display: "block",
                      lineHeight: "1.35",
                    }}
                  >
                    {idx + 1}. {docName}
                  </label>

                  {isUploaded ? (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#065f46",
                        background: "#d1fae5",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "12px",
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      ✓ Uploaded
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "var(--ink-700)",
                        background: "var(--surface-muted)",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Required
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    marginTop: "0.15rem",
                  }}
                >
                  Accepted: PDF, PNG, JPG, JPEG (Max 10MB)
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={(el) => (fileInputRefs.current[docName] = el)}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.bmp,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSingleDocChange(docName, e.target.files[0]);
                  }
                }}
                style={{ display: "none" }}
              />

              {/* Uploaded State vs Empty State */}
              {isUploaded ? (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #bbf7d0",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.6rem 0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      overflow: "hidden",
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}>📄</span>
                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.84rem",
                          color: "var(--ink-900)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "170px",
                        }}
                        title={uploadedFile.name}
                      >
                        {uploadedFile.name}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        {formatFileSize(uploadedFile.size)}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Replace & Cancel / Remove */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRefs.current[docName]) {
                          fileInputRefs.current[docName].click();
                        }
                      }}
                      style={{
                        background: "none",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.75rem",
                        color: "var(--ink-700)",
                        cursor: "pointer",
                      }}
                      title="Replace this document"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(docName)}
                      style={{
                        background: "#fee2e2",
                        border: "1px solid #fecaca",
                        borderRadius: "4px",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#991b1b",
                        cursor: "pointer",
                      }}
                      title="Cancel / Remove this document"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRefs.current[docName]) {
                      fileInputRefs.current[docName].click();
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.65rem 1rem",
                    background: "var(--surface-muted)",
                    border: "1px dashed var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--ink-700)",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease-in-out",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--ink-700)";
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--surface-muted)";
                  }}
                >
                  <span>📎</span>
                  <span>Choose / Upload Document</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Supporting Documents (Optional) */}
      <div
        style={{
          background: "var(--surface-muted)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "1rem 1.15rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--ink-900)" }}>
              Additional Supporting Documents (Optional)
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Attach any additional certificates, guarantor documents, or tax forms
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
              padding: "0.45rem 0.85rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              background: "#ffffff",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "var(--ink-800)",
            }}
          >
            <span>+</span>
            <span>Add Extra Document</span>
          </button>
        </div>

        {additionalFiles.length > 0 && (
          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {additionalFiles.map((file, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#ffffff",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", overflow: "hidden" }}>
                  <span>📑</span>
                  <span
                    style={{
                      fontSize: "0.83rem",
                      fontWeight: 500,
                      color: "var(--ink-900)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAdditional(idx)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--danger)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    padding: "0.15rem 0.4rem",
                  }}
                  title="Remove extra document"
                >
                  ✕ Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
