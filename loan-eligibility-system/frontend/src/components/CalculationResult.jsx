import React from "react";
import { Link } from "react-router-dom";

const LABELS = {
  annual_income: "Annual Income",
  dti_ratio: "Debt-to-Income Ratio (DTI)",
  disposable_income: "Disposable Income",
  emi_affordability_flag: "EMI Affordability",
  estimated_emi: "Estimated EMI",
  ltv_ratio: "Loan-to-Value Ratio (LTV)",
  loan_to_income_ratio: "Loan-to-Income Ratio",
  total_education_cost: "Total Education Cost",
  requested_loan_percentage: "Requested Loan % of Total Cost",
  repayment_burden_ratio: "Repayment Burden Ratio",
  affordability_flag: "Affordability",
};

const FLAG_COLOR = {
  AFFORDABLE: "var(--success)",
  TIGHT: "var(--warning)",
  NOT_AFFORDABLE: "var(--danger)",
};

function formatValue(key, value) {
  if (key.endsWith("_flag") || key === "affordability_flag") return value;
  if (key.includes("ratio") || key.includes("percentage")) {
    return `${(parseFloat(value) * 100).toFixed(2)}%`;
  }
  if (key.includes("income") || key.includes("emi") || key.includes("cost")) {
    return `₹${Number(value).toLocaleString("en-IN")}`;
  }
  return value;
}

export default function CalculationResult({ result }) {
  if (!result) return null;
  const { application_code, verification_code, calculated, warnings } = result;

  return (
    <div className="card">
      <h2>Application Created</h2>
      <p>
        <strong>Application ID:</strong> {application_code}
        <br />
        <strong>Verification Code:</strong> {verification_code}
      </p>
      <p style={{ fontSize: "0.85rem", color: "#555" }}>
        Save these -- your branch manager will need both to locate and verify your
        application.
      </p>

      <h3>Calculated Financial Indicators</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {Object.entries(calculated || {}).map(([key, value]) => (
            <tr key={key} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "0.4rem 0", color: "#555" }}>{LABELS[key] || key}</td>
              <td
                style={{
                  padding: "0.4rem 0",
                  textAlign: "right",
                  fontWeight: 600,
                  color: FLAG_COLOR[value] || "inherit",
                }}
              >
                {formatValue(key, value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {warnings && warnings.length > 0 && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#fdf2e9", borderRadius: "6px" }}>
          {warnings.map((w, i) => (
            <p key={i} style={{ margin: "0.25rem 0", color: "#b9770e" }}>
              ⚠ {w}
            </p>
          ))}
        </div>
      )}

      <p style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: "#555" }}>
        This is an initial, AI-assisted calculation only and is not a loan approval.
        Document upload and branch verification are the next steps (coming in a later phase).
      </p>

      <Link className="btn" to="/applicant/tracking">
        Go to My Applications
      </Link>
    </div>
  );
}
