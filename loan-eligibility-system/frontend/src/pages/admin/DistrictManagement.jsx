import React, { useEffect, useState } from "react";
import DashboardHeader from "../../components/DashboardHeader";
import apiClient from "../../services/apiClient";

const NAV_LINKS = [
  { to: "/admin/districts", label: "Districts" },
  { to: "/admin/branches", label: "Branches" },
  { to: "/admin/managers", label: "Managers" },
];

export default function DistrictManagement() {
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", state: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDistricts();
  }, []);

  const loadDistricts = async () => {
    try {
      const response = await apiClient.get("/api/admin/districts");
      setDistricts(response.data);
    } catch (err) {
      setError("Failed to load districts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await apiClient.post("/api/admin/districts", formData);
      setFormData({ name: "", state: "" });
      setShowForm(false);
      loadDistricts();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to create district");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <DashboardHeader links={NAV_LINKS} initials="A" />

      <div className="page">
        <h1>District Management</h1>
        <p>Create and manage regional districts</p>

        {error && <p className="error-text">{error}</p>}

        <div className="card">
          {!showForm ? (
            <button className="btn" onClick={() => setShowForm(true)}>
              + Create District
            </button>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="required">District Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <label>State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ name: "", state: "" });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="card" style={{ marginTop: "2rem" }}>
          <h2>All Districts</h2>

          {loading ? (
            <p>Loading...</p>
          ) : districts.length === 0 ? (
            <p>No districts yet. Create one to get started.</p>
          ) : (
            districts.map(district => (
              <div
                key={district.id}
                style={{
                  padding: "1rem",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>{district.name}</strong>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    {district.state} • {district.branch_count} branches
                  </div>
                </div>
                <a href={`/admin/districts/${district.id}/branches`} className="btn">
                  View Branches →
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
