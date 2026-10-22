import React, { useMemo, useState } from "react";

function calculateEmi(principal, annualRatePercent, tenureMonths) {
  const p = Number(principal);
  const n = Number(tenureMonths);
  const r = Number(annualRatePercent) / 12 / 100;

  if (!p || !n || p <= 0 || n <= 0) {
    return { emi: 0, totalInterest: 0, totalRepayment: 0 };
  }
  if (r === 0) {
    const emi = p / n;
    return { emi, totalInterest: 0, totalRepayment: p };
  }
  const factor = Math.pow(1 + r, n);
  const emi = (p * r * factor) / (factor - 1);
  const totalRepayment = emi * n;
  const totalInterest = totalRepayment - p;
  return { emi, totalInterest, totalRepayment };
}

const formatCurrency = (value) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function EMICalculator() {
  const [loanAmount, setLoanAmount] = useState(500000);
  const [interestRate, setInterestRate] = useState(10);
  const [tenureMonths, setTenureMonths] = useState(60);

  const { emi, totalInterest, totalRepayment } = useMemo(
    () => calculateEmi(loanAmount, interestRate, tenureMonths),
    [loanAmount, interestRate, tenureMonths]
  );

  return (
    <div className="page">
      <h1>EMI Calculator</h1>
      <p>Adjust the values below to see how they affect your monthly EMI and total repayment.</p>

      <div className="card">
        <label>Loan Amount (₹)</label>
        <input
          type="number"
          min="1000"
          value={loanAmount}
          onChange={(e) => setLoanAmount(e.target.value)}
        />

        <label>Annual Interest Rate (%)</label>
        <input
          type="number"
          min="0"
          max="40"
          step="0.1"
          value={interestRate}
          onChange={(e) => setInterestRate(e.target.value)}
        />

        <label>Loan Tenure (months)</label>
        <input
          type="number"
          min="1"
          max="480"
          value={tenureMonths}
          onChange={(e) => setTenureMonths(e.target.value)}
        />
      </div>

      <div className="card">
        <h2>Results</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "0.5rem 0" }}>Monthly EMI</td>
              <td style={{ padding: "0.5rem 0", textAlign: "right", fontWeight: 700, color: "#1a5276" }}>
                {formatCurrency(emi)}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "0.5rem 0" }}>Total Interest Payable</td>
              <td style={{ padding: "0.5rem 0", textAlign: "right" }}>{formatCurrency(totalInterest)}</td>
            </tr>
            <tr>
              <td style={{ padding: "0.5rem 0" }}>Total Repayment</td>
              <td style={{ padding: "0.5rem 0", textAlign: "right" }}>{formatCurrency(totalRepayment)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
