import React, { useState, useEffect } from "react";
import { createPersonalLoan, createPersonalLoanWithDocs, getApplicantBranches } from "../../services/applicationService";
import OCRVerificationReport from "../../components/OCRVerificationReport";
import DocumentAttachmentSection from "../../components/DocumentAttachmentSection";

const initialForm = {
  branch_id: "",
  age: "",
  gender: "",
  employment_type: "SALARIED",
  employment_duration_months: "",
  monthly_income: "",
  credit_score: "",
  existing_loans_count: "0",
  existing_emi: "0",
  number_of_dependents: "0",
  requested_amount: "",
  loan_tenure_months: "",
};

const REQUIRED_DOCS = [
  "Identity Proof (Aadhaar / PAN Card / Passport)",
  "Income Proof (Latest 3 Months Salary Slip / Form 16 / ITR)",
  "Bank Statement (Last 3-6 Months)",
  "Address Proof (Electricity Bill / Voter ID / Rental Agreement)",
];

export default function PersonalLoanForm() {
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
        age: Number(form.age),
        gender: form.gender || null,
        employment_duration_months: Number(form.employment_duration_months),
        monthly_income: Number(form.monthly_income),
        credit_score: form.credit_score ? Number(form.credit_score) : null,
        existing_loans_count: Number(form.existing_loans_count || 0),
        existing_emi: Number(form.existing_emi || 0),
        number_of_dependents: Number(form.number_of_dependents || 0),
        requested_amount: Number(form.requested_amount),
        loan_tenure_months: Number(form.loan_tenure_months),
      };

      setProcessingStage("2/3 Verifying document details & checking cross-match...");

      let data;
      if (files.length > 0) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(payload));
        for (const file of files) {
          formData.append("files", file);
        }
        data = await createPersonalLoanWithDocs(formData);
      } else {
        data = await createPersonalLoan(payload);
      }

      setProcessingStage("3/3 Generating verification report & eligibility assessment...");
      setResult(data);
    } catch (err) {
      console.error("Personal loan submission error:", err);
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
        <h1>Personal Loan Application</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Submission completed. Review your document verification analysis, match matrix, and AI evaluation report below.
        </p>
        <OCRVerificationReport result={result} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Personal Loan Application</h1>
      <p>Financial support for personal expenses, based on your income and obligations.</p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-section-title">1. Applicant Personal Details</div>
          <div className="form-grid">
            <div>
              <label className="required" htmlFor="age">Age</label>
              <input id="age" type="number" name="age" min="18" max="100" placeholder="e.g. 28" value={form.age} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="gender">Gender</label>
              <select id="gender" name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Prefer not to say</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="form-section-title">2. Employment &amp; Income</div>
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
              <label className="required" htmlFor="employment_duration_months">Employment Duration (months)</label>
              <input id="employment_duration_months" type="number" name="employment_duration_months" min="0" placeholder="e.g. 24" value={form.employment_duration_months} onChange={handleChange} required />
            </div>
            <div>
              <label className="required" htmlFor="monthly_income">Monthly Income (₹)</label>
              <input id="monthly_income" type="number" name="monthly_income" min="1" placeholder="e.g. 60000" value={form.monthly_income} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="credit_score">Credit Score</label>
              <input id="credit_score" type="number" name="credit_score" min="300" max="900" placeholder="e.g. 740" value={form.credit_score} onChange={handleChange} />
            </div>
          </div>

          <div className="form-section-title">3. Existing Obligations</div>
          <div className="form-grid">
            <div>
              <label className="required" htmlFor="existing_loans_count">Number of Existing Loans</label>
              <input id="existing_loans_count" type="number" name="existing_loans_count" min="0" value={form.existing_loans_count} onChange={handleChange} required />
            </div>
            <div>
              <label className="required" htmlFor="existing_emi">Existing Monthly EMI (₹)</label>
              <input id="existing_emi" type="number" name="existing_emi" min="0" placeholder="e.g. 0" value={form.existing_emi} onChange={handleChange} required />
            </div>
            <div>
              <label className="required" htmlFor="number_of_dependents">Number of Dependents</label>
              <input id="number_of_dependents" type="number" name="number_of_dependents" min="0" value={form.number_of_dependents} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-section-title">4. Loan Details</div>
          <div className="form-grid">
            <div>
              <label className="required" htmlFor="requested_amount">Requested Loan Amount (₹)</label>
              <input id="requested_amount" type="number" name="requested_amount" min="1" placeholder="e.g. 300000" value={form.requested_amount} onChange={handleChange} required />
            </div>
            <div>
              <label className="required" htmlFor="loan_tenure_months">Loan Tenure (months)</label>
              <input id="loan_tenure_months" type="number" name="loan_tenure_months" min="3" max="360" placeholder="e.g. 36" value={form.loan_tenure_months} onChange={handleChange} required />
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
            loanType="Personal"
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
