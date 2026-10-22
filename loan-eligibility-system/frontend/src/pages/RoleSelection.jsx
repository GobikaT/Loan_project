import React from "react";
import RoleCard from "../components/RoleCard";

export default function RoleSelection() {
  return (
    <div className="page">
      <h1>Continue as</h1>
      <p>Choose how you'd like to use Meridian Trust Bank's loan platform.</p>

      <div className="role-grid">
        <RoleCard
          to="/applicant/login"
          icon="👤"
          title="Applicant"
          description="Apply for loans and track your applications."
          accent="var(--ink-600)"
        />
        <RoleCard
          to="/manager/login"
          icon="🏦"
          title="Manager"
          description="Review and manage eligible loan applications."
          accent="var(--brass-500)"
        />
        <RoleCard
          to="/admin/login"
          icon="⚙"
          title="Admin"
          description="Manage districts, branches, and branch managers."
          accent="var(--ink-900)"
        />
      </div>
    </div>
  );
}
