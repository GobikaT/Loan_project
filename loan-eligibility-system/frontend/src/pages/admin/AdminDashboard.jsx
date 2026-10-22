import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardHeader from "../../components/DashboardHeader";
import apiClient from "../../services/apiClient";

const NAV_LINKS = [
  { to: "/admin/districts", label: "Districts" },
  { to: "/admin/branches", label: "Branches" },
  { to: "/admin/managers", label: "Managers" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    districts: 0,
    branches: 0,
    managers: 0,
    applications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [districts, branches, managers] = await Promise.all([
          apiClient.get("/api/admin/districts"),
          apiClient.get("/api/admin/branches"),
          apiClient.get("/api/admin/managers"),
        ]);
        
        setStats({
          districts: districts.data.length,
          branches: branches.data.length,
          managers: managers.data.length,
          applications: 0,
        });
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <DashboardHeader links={NAV_LINKS} initials="A" />

      <div className="dash-hero">
        <div className="dash-hero-inner">
          <h1>Admin Control Panel</h1>
          <p>Manage districts, branches, and branch managers</p>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Districts</div>
              <div className="stat-value">{loading ? "..." : stats.districts}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Branches</div>
              <div className="stat-value">{loading ? "..." : stats.branches}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Managers</div>
              <div className="stat-value">{loading ? "..." : stats.managers}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">System Active</div>
              <div className="stat-value" style={{ color: "#10b981", fontSize: "1.2rem" }}>ONLINE</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-content">
        <h2>Quick Actions</h2>

        <div className="loan-grid">
          <div className="loan-card">
            <span className="loan-icon">📍</span>
            <h3>Manage Districts</h3>
            <p>Create and manage regional districts</p>
            <Link to="/admin/districts" className="btn">Open →</Link>
          </div>

          <div className="loan-card">
            <span className="loan-icon">🏢</span>
            <h3>Manage Branches</h3>
            <p>View, create, and organize bank branches</p>
            <Link to="/admin/branches" className="btn">Open →</Link>
          </div>

          <div className="loan-card">
            <span className="loan-icon">👤</span>
            <h3>Manage Managers</h3>
            <p>Provision and assign branch managers</p>
            <Link to="/admin/managers" className="btn">Open →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
