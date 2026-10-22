import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardHeader from "../../components/DashboardHeader";
import { getDashboardSummary } from "../../services/applicationService";

const NAV_LINKS = [
  { to: "/applicant/tracking", label: "My Applications" },
  { to: "/applicant/document-upload", label: "Document Verification" },
  { to: "/applicant/emi-calculator", label: "EMI Calculator" },
];

export default function ApplicantDashboard() {
  const [userName, setUserName] = useState("Applicant");
  const [stats, setStats] = useState({
    applied_loans: 0,
    total_loans: 0,
    existing_loan_amount: null,
    credit_score: null,
  });

  useEffect(() => {
    try {
      const user = localStorage.getItem("user");
      if (user) {
        const userData = JSON.parse(user);
        setUserName(userData.full_name?.split(" ")[0] || "Applicant");
      }
    } catch (err) {
      console.error("Failed to parse user", err);
    }

    (async () => {
      try {
        const data = await getDashboardSummary();
        if (data) setStats(data);
      } catch (e) {
        console.warn("Could not load dashboard stats", e);
      }
    })();
  }, []);

  return (
    <div>
      <DashboardHeader links={NAV_LINKS} initials={userName[0] || "A"} />

      <div className="dash-hero">
        <div className="dash-hero-inner">
          <h1>Welcome, {userName}! 👋</h1>
          <p>Manage your loan applications, attach supporting documents, and track approval status</p>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Applications</div>
              <div className="stat-value">{stats.applied_loans || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Approved Loans</div>
              <div className="stat-value">{stats.total_loans || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Loan Value</div>
              <div className="stat-value">{stats.existing_loan_amount ? `₹${Number(stats.existing_loan_amount).toLocaleString("en-IN")}` : "None"}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Credit Score</div>
              <div className="stat-value">{stats.credit_score || "N/A"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-content">
        <h2>Apply for a Loan with Instant Verification</h2>
        <p>Choose a loan type below and provide your details and documents for instant eligibility assessment.</p>

        <div className="loan-grid">
          <div className="loan-card">
            <span className="loan-icon">🎓</span>
            <h3>Education Loan</h3>
            <p>Tuition and college fee funding with automated document verification</p>
            <div className="loan-details">
              <div>Interest Rate: 9.0% p.a.</div>
              <div>Tenure: 12-180 months</div>
              <div style={{ color: "var(--success)", fontWeight: 600 }}>Instant Verification Ready</div>
            </div>
            <Link to="/applicant/education-loan" className="btn">
              Apply Now →
            </Link>
          </div>

          <div className="loan-card">
            <span className="loan-icon">💳</span>
            <h3>Personal Loan</h3>
            <p>Quick personal finance with instant salary slip and ID proof verification</p>
            <div className="loan-details">
              <div>Interest Rate: 11.5% p.a.</div>
              <div>Tenure: 12-60 months</div>
              <div style={{ color: "var(--success)", fontWeight: 600 }}>Instant Verification Ready</div>
            </div>
            <Link to="/applicant/personal-loan" className="btn">
              Apply Now →
            </Link>
          </div>

          <div className="loan-card">
            <span className="loan-icon">🏠</span>
            <h3>Home Loan</h3>
            <p>Property purchase &amp; renovation loans with automated document screening</p>
            <div className="loan-details">
              <div>Interest Rate: 8.5% p.a.</div>
              <div>Tenure: 120-240 months</div>
              <div style={{ color: "var(--success)", fontWeight: 600 }}>Instant Verification Ready</div>
            </div>
            <Link to="/applicant/home-loan" className="btn">
              Apply Now →
            </Link>
          </div>
        </div>

        <div style={{ marginTop: "2rem", padding: "1.25rem", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
          <h3 style={{ margin: 0 }}>📊 Applicant Tools &amp; Actions</h3>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            <Link to="/applicant/tracking" className="btn-secondary">
              📑 Track My Applications
            </Link>
            <Link to="/applicant/document-upload" className="btn-secondary">
              🔍 Upload Supporting Documents
            </Link>
            <Link to="/applicant/emi-calculator" className="btn-secondary">
              🧮 EMI Calculator
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}