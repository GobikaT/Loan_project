import React from "react";
import { Link } from "react-router-dom";

export default function LoanCard({ icon, title, description, to }) {
  return (
    <div className="loan-card">
      <span className="loan-icon" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link className="btn" to={to}>Apply Now</Link>
    </div>
  );
}
