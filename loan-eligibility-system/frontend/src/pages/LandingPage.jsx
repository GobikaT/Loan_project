import React from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="hero">
      <div className="hero-eyebrow">Meridian Trust Bank</div>
      <h1>Plan your dreams. Finance your future.</h1>
      <p className="hero-sub">
        Get an instant, AI-assisted read on your loan eligibility for personal, home, or
        education needs -- reviewed and finalized by a real branch manager before any
        decision is final.
      </p>
      <button className="btn" onClick={() => navigate("/roles")}>
        Explore →
      </button>
    </div>
  );
}
