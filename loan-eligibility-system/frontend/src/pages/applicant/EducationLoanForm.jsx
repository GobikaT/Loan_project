import React, { useState, useEffect } from "react";
import { createEducationLoan, createEducationLoanWithDocs, getApplicantBranches } from "../../services/applicationService";
import OCRVerificationReport from "../../components/OCRVerificationReport";
import DocumentAttachmentSection from "../../components/DocumentAttachmentSection";

const initialForm = {
  branch_id: "",
  student_name: "",
  student_age: "",
  qualification: "",
  institution: "",
  course: "",
  course_duration_months: "",
  tuition_fee: "",
  other_expenses: "0",
  applicant_income: "0",
  co_applicant_income: "0",
  existing_obligations: "0",
  credit_score: "",
  requested_amount: "",
  loan_tenure_months: "",
};

const REQUIRED_DOCS = [
  "Admission / Offer Letter",
  "Fee Structure / Estimation Schedule",
  "Academic Marksheet / Certificate",
  "Student Identity Proof (Aadhaar / Passport)",
  "Co-Applicant Income Proof (Salary Slip / ITR)",
];

export default function EducationLoanForm() {
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
    setProcessingStage("1/3 Initializing application & reading documents...");

    try {
      const payload = {
        ...form,
        branch_id: Number(form.branch_id),
        student_age: Number(form.student_age),
        qualification: form.qualification || null,
        course_duration_months: Number(form.course_duration_months),
        tuition_fee: Number(form.tuition_fee),
        other_expenses: Number(form.other_expenses || 0),
        applicant_income: Number(form.applicant_income || 0),
        co_applicant_income: Number(form.co_applicant_income || 0),
        existing_obligations: Number(form.existing_obligations || 0),
        credit_score: form.credit_score ? Number(form.credit_score) : null,
        requested_amount: Number(form.requested_amount),
        loan_tenure_months: Number(form.loan_tenure_months),
      };

      setProcessingStage("2/3 Verifying document details & comparing student information...");

      let data;
      if (files.length > 0) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(payload));
        for (const file of files) {
          formData.append("files", file);
        }
        data = await createEducationLoanWithDocs(formData);
      } else {
        data = await createEducationLoan(payload);
      }

      setProcessingStage("3/3 Generating comprehensive verification & eligibility report...");
      setResult(data);
    } catch (err) {
      console.error("Education loan submission error:", err);
      if (err?.response?.status === 401) {
        setError("Your session has expired or you are not logged in. Please log in again to submit your application.");
        return;
      }
      const detail = err?.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
          : typeof detail === "string"
          ? detail
          : "Could not submit education loan application. Please verify all required fields."
      );
    } finally {
      setSubmitting(false);
      setProcessingStage("");
    }
  };

  if (result) {
    return (
      <div className="page">
        <h1>Education Loan Application</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Submission completed. Review your document verification analysis, match matrix, and AI evaluation report below.
        </p>
        <OCRVerificationReport result={result} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Education Loan Application</h1>
      <p>Financial support for higher education, academic fees, and course expenses.</p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Section 1: Student Details */}
          <div className="form-section-title">1. Student Personal Details</div>
          <div className="form-grid">
            <div>
              <label className="required" htmlFor="student_name">Student Full Name</label>
              <input
                id="student_name"
                type="text"
                name="student_name"
                placeholder="e.g. Rahul Sharma"
                value={form.student_name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="required" htmlFor="student_age">Student Age</label>
              <input
                id="student_age"
                type="number"
                name="student_age"
                min="16"
                max="60"
                placeholder="e.g. 21"
                value={form.student_age}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="qualification">Prior Qualification</label>
              <input
                id="qualification"
                type="text"
                name="qualification"
                placeholder="e.g. Higher Secondary / B.Sc"
                value={form.qualification}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Section 2: Course & Institution */}
          <div className="form-section-title">2. Institution &amp; Program Details</div>
          <div className="form-grid">
            <div>
              <label className="required" htmlFor="institution">Institution / University Name</label>
              <input
                id="institution"
                type="text"
                name="institution"
                placeholder="e.g. National Institute of Technology"
                value={form.institution}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="required" htmlFor="course">Course / Degree</label>
              <input
                id="course"
                type="text"
                name="course"
                placeholder="e.g. B.Tech Computer Science"
                value={form.course}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="required" htmlFor="course_duration_months">Course Duration (months)</label>
              <input
                id="course_duration_months"
                type="number"
                name="course_duration_months"
                min="6"
                max="120"
                placeholder="e.g. 48"
                value={form.course_duration_months}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Section 3: Cost Estimates */}
          <div className="form-section-title">3. Fee &amp; Cost Structure</div>
          <div className="form-grid">
            <div>
              <label className="required" htmlFor="tuition_fee">Total Tuition Fee (₹)</label>
              <input
                id="tuition_fee"
                type="number"
                name="tuition_fee"
                min="1"
                placeholder="e.g. 600000"
                value={form.tuition_fee}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="other_expenses">Hostel / Living / Other Expenses (₹)</label>
              <input
                id="other_expenses"
                type="number"
                name="other_expenses"
                min="0"
                placeholder="e.g. 150000"
                value={form.other_expenses}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Section 4: Financial Background */}
          <div className="form-section-title">4. Family / Co-Applicant Financial Profile</div>
          <div className="form-grid">
            <div>
              <label htmlFor="applicant_income">Applicant Monthly Income (₹, if any)</label>
              <input
                id="applicant_income"
                type="number"
                name="applicant_income"
                min="0"
                placeholder="e.g. 0"
                value={form.applicant_income}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="required" htmlFor="co_applicant_income">Co-Applicant (Parent/Guardian) Monthly Income (₹)</label>
              <input
                id="co_applicant_income"
                type="number"
                name="co_applicant_income"
                min="0"
                placeholder="e.g. 65000"
                value={form.co_applicant_income}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="existing_obligations">Existing Monthly Obligations / EMIs (₹)</label>
              <input
                id="existing_obligations"
                type="number"
                name="existing_obligations"
                min="0"
                placeholder="e.g. 5000"
                value={form.existing_obligations}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="credit_score">Co-Applicant Credit Score</label>
              <input
                id="credit_score"
                type="number"
                name="credit_score"
                min="300"
                max="900"
                placeholder="e.g. 740"
                value={form.credit_score}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Section 5: Requested Loan */}
          <div className="form-section-title">5. Requested Loan Terms</div>
          <div className="form-grid">
            <div>
              <label className="required" htmlFor="requested_amount">Requested Loan Amount (₹)</label>
              <input
                id="requested_amount"
                type="number"
                name="requested_amount"
                min="1"
                placeholder="e.g. 500000"
                value={form.requested_amount}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="required" htmlFor="loan_tenure_months">Repayment Tenure (months)</label>
              <input
                id="loan_tenure_months"
                type="number"
                name="loan_tenure_months"
                min="12"
                max="180"
                placeholder="e.g. 84"
                value={form.loan_tenure_months}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Section 6: Processing Branch Assignment */}
          <div className="form-section-title">6. Application Processing Branch</div>
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

          {/* Section 7: Individual Document Upload Section */}
          <DocumentAttachmentSection
            documents={REQUIRED_DOCS}
            files={files}
            setFiles={setFiles}
            loanType="Education"
          />

          {error && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px" }}>
              <p style={{ color: "var(--danger)", margin: 0, fontWeight: 500 }}>{error}</p>
            </div>
          )}

          {submitting && processingStage && (
            <div
              style={{
                marginTop: "1.25rem",
                padding: "1rem",
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div style={{ fontSize: "1.5rem" }}>⚡</div>
              <div>
                <div style={{ fontWeight: 700, color: "var(--success)" }}>Processing Application &amp; Document Verification</div>
                <div style={{ fontSize: "0.85rem", color: "var(--ink-700)" }}>{processingStage}</div>
              </div>
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
