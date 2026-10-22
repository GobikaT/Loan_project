import React from "react";
import { Link } from "react-router-dom";

export default function RoleCard({ to, icon, title, description, accent }) {
  return (
    <Link to={to} className="role-card" style={{ "--role-accent": accent }}>
      <span className="role-icon" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </Link>
  );
}
