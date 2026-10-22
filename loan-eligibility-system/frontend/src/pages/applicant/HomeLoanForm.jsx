import React, { useState, useEffect } from "react";
import { createHomeLoan, createHomeLoanWithDocs, getApplicantBranches } from "../../services/applicationService";
import OCRVerificationReport from "../../components/OCRVerificationReport";
import DocumentAttachmentSection from "../../components/DocumentAttachmentSection";

const initialForm = {
  branch_id: "",
  employment_type: "SALARIED",
  monthly_income: "",
  co_applicant_income: "0",
  credit_score: "",
  existing_loans_count: "0",
  existing_emi: "0",
  property_value: "",
  down_payment: "0",
  existing_liabilities: "0",
  requested_amount: "",
  loan_tenure_months: "",
};

const REQUIRED_DOCS = [
  "Property Documents (Sale Agreement / Title Deed / Estimation)",
  "Income Proof (Salary Slips for 3 Months / ITR for 2 Years)",
  "Bank Statements (Last 6 Months)",
  "Applicant & Co-Applicant ID Proof (Aadhaar / PAN / Passport)",
];

export default function HomeLoanForm() {
  const [form, setForm] = useState(initialForm);
  const [branches, setBranches] = useState([]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const branchList = await getApplicantBranches();
        setBranches(branchList);
        if (branchList.length > 0) {
          setForm((prev) => ({ ...prev, branch_id: String(branchList[0].id) }));
        }
      } catch (err) {
        console.error("Failed loading branches:", err);
      }
    })();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.branch_id) {
      setError("Please select a bank branch for application submission.");
      return;
    }

    setSubmitting(true);
    setProcessingStage("1/3 Reading application details & documents...");
    try {
      const payload = {
        ...form,
        branch_id: Number(form.branch_id),
        monthly_income: Number(form.monthly_income),
        co_applicant_income: Number(form.co_applicant_income || 0),
        credit_score: form.credit_score ? Number(form.credit_score) : null,
        existing_loans_count: Number(form.existing_loans_count || 0),
        existing_emi: Number(form.existing_emi || 0),
        property_value: Number(form.property_value),
        down_payment: Number(form.down_payment || 0),
        existing_liabilities: Number(form.existing_liabilities || 0),
        requested_amount: Number(form.requested_amount),
        loan_tenure_months: Number(form.loan_tenure_months),
      };

      setProcessingStage("2/3 Verifying document details & comparing property and income information...");

      let data;
      if (files.length > 0) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(payload));
        for (const file of files) {
          formData.append("files", file);
        }
        data = await createHomeLoanWithDocs(formData);
      } else {
        data = await createHomeLoan(payload);
      }

      setProcessingStage("3/3 Generating verification report & eligibility assessment...");
      setResult(data);
    } catch (err) {
      console.error("Home loan submission error:", err);
      if (err?.response?.status === 401) {
        setError("Your session has expired or you are not logged in. Please log in again to submit your application.");
        return;
      }
      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : detail || "Could not submit application.");
    } finally {
      setSubmitting(false);
      setProcessingStage("");
    }
  };

  if (result) {
    return (
      <div className="page">
        <h1>Home Loan Application</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Submission completed. Review your document verification analysis, match matrix, and AI evaluation report below.
        </p>
        <OCRVerificationReport result={result} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Home Loan Application</h1>
      <p>Finance purchase, construction, or renovation of residential property.</p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-section-title">1. Employment &amp; Income</div>
          <div className="form-grid">
            <div>
              <label className="required" htmlFor="employment_type">Employment Type</label>
              <select id="employment_type" name="employment_type" value={form.employment_type} onChange={handleChange} required>
                <option value="SALARIED">Salaried</option>
                <option value="SELF_EMPLOYED">Self-Employed</option>
                <option value="BUSINESS_OWNER">Business Owner</option>
                <option value="UNEMPLOYED">Unemployed</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="required" htmlFor="monthly_income">Applicant Monthly Income (₹)</label>
              <input id="monthly_income" type="number" name="monthly_income" min="1" placeholder="e.g. 85000" value={form.monthly_income} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="co_applicant_income">Co-Applicant Monthly Income (₹)</label>
              <input id="co_applicant_income" type="number" name="co_applicant_income" min="0" placeholder="e.g. 40000" value={form.co_applicant_income} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="credit_score">Credit Score</label>
              <input id="credit_score" type="number" name="credit_score" min="300" max="900" placeholder="e.g. 760" value={form.credit_score} onChange={handleChange} />
            </div>
          </div>

          <div className="form-section-title">2. Property Information</div>
          <div className="form-grid">
            <div>
              <label className="required" htmlFor="property_value">Estimated Property Value (₹)</label>
              <input id="property_value" type="number" name="property_value" min="1" placeholder="e.g. 5000000" value={form.property_value} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="down_payment">Down Payment / Own Contribution (₹)</label>
              <input id="down_payment" type="number" name="down_payment" min="0" placeholder="e.g. 1000000" value={form.down_payment} onChange={handleChange} />
            </div>
          </div>

          <div className="form-section-title">3. Obligations &amp; Liabilities</div>
          <div className="form-grid">
            <div>
              <label className="required" htmlFor="existing_loans_count">Existing Loans Count</label>
              <input id="existing_loans_count" type="number" name="existing_loans_count" min="0" value={form.existing_loans_count} onChange={handleChange} required />
            </div>
            <div>
              <label className="required" htmlFor="existing_emi">Existing Monthly EMI (₹)</label>
              <input id="existing_emi" type="number" name="existing_emi" min="0" placeholder="e.g. 10000" value={form.existing_emi} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="existing_liabilities">Total Existing Liabilities (₹)</label>
              <input id="existing_liabilities" type="number" name="existing_liabilities" min="0" placeholder="e.g. 0" value={form.existing_liabilities} onChange={handleChange} />
            </div>
          </div>

          <div className="form-section-title">4. Requested Loan Terms</div>
          <div className="form-grid">
            <div>
              <label className="required" htmlFor="requested_amount">Requested Loan Amount (₹)</label>
              <input id="requested_amount" type="number" name="requested_amount" min="1" placeholder="e.g. 4000000" value={form.requested_amount} onChange={handleChange} required />
            </div>
            <div>
              <label className="required" htmlFor="loan_tenure_months">Loan Tenure (months)</label>
              <input id="loan_tenure_months" type="number" name="loan_tenure_months" min="12" max="360" placeholder="e.g. 240" value={form.loan_tenure_months} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-section-title">5. Application Processing Branch</div>
          <div className="form-grid">
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="required" htmlFor="branch_id">Select Processing Bank Branch</label>
              <select
                id="branch_id"
                name="branch_id"
                value={form.branch_id}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  fontSize: "0.95rem",
                  backgroundColor: "#ffffff",
                }}
              >
                <option value="">-- Choose your nearest bank branch --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name} {b.city ? `(${b.city}, ${b.state || ''})` : ""} {b.manager_name ? `• Manager: ${b.manager_name}` : ""}
                  </option>
                ))}
              </select>
              <small style={{ color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>
                Your application and verified documents will be automatically mapped to the Branch Manager at this branch for review.
              </small>
            </div>
          </div>

          <DocumentAttachmentSection
            documents={REQUIRED_DOCS}
            files={files}
            setFiles={setFiles}
            loanType="Home"
          />

          {error && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px" }}>
              <p style={{ color: "var(--danger)", margin: 0, fontWeight: 500 }}>{error}</p>
            </div>
          )}

          {submitting && processingStage && (
            <div style={{ marginTop: "1.25rem", padding: "1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontWeight: 700, color: "var(--success)" }}>Processing Application &amp; Document Verification</div>
              <div style={{ fontSize: "0.85rem", color: "var(--ink-700)" }}>{processingStage}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: "1.5rem",
              width: "100%",
              padding: "0.9rem",
              fontSize: "1.05rem",
              fontWeight: 600,
            }}
          >
            {submitting ? "Analyzing & Generating Report..." : "Submit Application & Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}
