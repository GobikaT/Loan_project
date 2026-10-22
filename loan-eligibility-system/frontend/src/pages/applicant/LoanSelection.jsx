import React from "react";
import { Link } from "react-router-dom";

const LOAN_TYPES = [
  {
    key: "education",
    title: "Education Loan",
    description: "Financial support for college/university tuition fees, course expenses, and student living costs with automated document verification.",
    icon: "🎓",
    path: "/applicant/education-loan",
  },
  {
    key: "personal",
    title: "Personal Loan",
    description: "For personal expenses, medical costs, and emergency funds based on income and existing obligations.",
    icon: "💳",
    path: "/applicant/personal-loan",
  },
  {
    key: "home",
    title: "Home Loan",
    description: "For purchasing, constructing, or renovating property with attractive terms and instant eligibility analysis.",
    icon: "🏠",
    path: "/applicant/home-loan",
  },
];

export default function LoanSelection() {
  return (
    <div className="page">
      <h1>Select a Loan Type</h1>
      <p>Choose the loan product that fits your needs. Attach your documents for instant cross-verification.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem", marginTop: "1.5rem" }}>
        {LOAN_TYPES.map((loan) => (
          <div className="card" key={loan.key} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{loan.icon}</div>
              <h2>{loan.title}</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.92rem" }}>{loan.description}</p>
            </div>
            <div style={{ marginTop: "1.25rem" }}>
              <Link className="btn" to={loan.path} style={{ width: "100%", textAlign: "center" }}>
                Apply for {loan.title} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
