import React, { useEffect, useState } from "react";
import DashboardHeader from "../../components/DashboardHeader";
import apiClient from "../../services/apiClient";

const NAV_LINKS = [
  { to: "/admin/districts", label: "Districts" },
  { to: "/admin/branches", label: "Branches" },
  { to: "/admin/managers", label: "Managers" },
];

export default function ManagerManagement() {
  const [managers, setManagers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create Manager Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newManager, setNewManager] = useState({
    full_name: "",
    email: "",
    phone: "",
    employee_code: "",
    branch_id: "",
  });
  const [creating, setCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const fetchData = async () => {
    try {
      const [mgrRes, branchRes] = await Promise.all([
        apiClient.get("/api/admin/managers"),
        apiClient.get("/api/admin/branches"),
      ]);
      setManagers(mgrRes.data);
      setBranches(branchRes.data);
    } catch (err) {
      console.error("Failed to load managers/branches:", err);
      setError("Failed to load manager records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateManager = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");
    setCreatedCredentials(null);

    try {
      const res = await apiClient.post("/api/admin/managers", {
        ...newManager,
        branch_id: Number(newManager.branch_id),
      });

      setSuccess(`Manager '${newManager.full_name}' created successfully.`);
      setCreatedCredentials({
        email: newManager.email,
        temporary_password: res.data.temporary_password,
        employee_code: res.data.employee_code,
      });

      setNewManager({
        full_name: "",
        email: "",
        phone: "",
        employee_code: "",
        branch_id: "",
      });

      await fetchData();
    } catch (err) {
      console.error("Failed to create manager:", err);
      setError(err?.response?.data?.detail || "Could not create branch manager.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <DashboardHeader links={NAV_LINKS} initials="A" />

      <div className="page" style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0 }}>Branch Manager Management</h1>
            <p style={{ color: "var(--text-muted)", marginTop: "0.25rem", fontSize: "0.95rem" }}>
              Provision manager accounts and inspect branch mappings.
            </p>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => {
              setShowCreateModal(true);
              setCreatedCredentials(null);
              setError("");
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <span>+</span>
            <span>Add Branch Manager</span>
          </button>
        </div>

        {error && <div className="card" style={{ borderLeft: "5px solid crimson", marginBottom: "1rem" }}><p style={{ color: "crimson", margin: 0 }}>{error}</p></div>}
        {success && <div className="card" style={{ borderLeft: "5px solid #16a34a", background: "#f0fdf4", marginBottom: "1rem" }}><p style={{ color: "#166534", margin: 0, fontWeight: 600 }}>✓ {success}</p></div>}

        {createdCredentials && (
          <div className="card" style={{ border: "2px solid #0284c7", background: "#f0f9ff", marginBottom: "1.5rem", padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#0369a1" }}>🔑 New Manager Login Credentials</h3>
            <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#0c4a6e" }}>
              Share these credentials securely with the branch manager. The password is generated server-side.
            </p>
            <div style={{ background: "#ffffff", padding: "0.75rem 1rem", borderRadius: "6px", border: "1px solid #bae6fd", fontFamily: "monospace", fontSize: "0.95rem" }}>
              <div><strong>Email:</strong> {createdCredentials.email}</div>
              <div><strong>Temporary Password:</strong> <span style={{ color: "#dc2626", fontWeight: "bold" }}>{createdCredentials.temporary_password}</span></div>
              <div><strong>Employee Code:</strong> {createdCredentials.employee_code}</div>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: "1.25rem" }}>
          <h2 style={{ margin: "0 0 1rem 0" }}>All Branch Managers ({managers.length})</h2>

          {loading ? (
            <p>Loading manager accounts...</p>
          ) : managers.length === 0 ? (
            <p>No branch managers provisioned yet. Click 'Add Branch Manager' to create one.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>Manager Name</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Employee Code</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Assigned Branch</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Contact</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((m) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                        👤 {m.manager_name}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <code>{m.employee_code}</code>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <strong style={{ color: "#0369a1" }}>🏛️ {m.branch_name || "Unassigned"}</strong>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div>{m.email}</div>
                        {m.phone && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.phone}</div>}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background: m.is_active ? "#ecfdf5" : "#fee2e2",
                            color: m.is_active ? "#065f46" : "#991b1b",
                          }}
                        >
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Manager Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#fff",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Provision Branch Manager Account</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManager}>
              <div style={{ marginBottom: "0.75rem" }}>
                <label className="required" style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.2rem" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Sundaram"
                  value={newManager.full_name}
                  onChange={(e) => setNewManager({ ...newManager, full_name: e.target.value })}
                  style={{ width: "100%", padding: "0.55rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div>
                  <label className="required" style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.2rem" }}>
                    Official Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="manager@bank.com"
                    value={newManager.email}
                    onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem" }}
                  />
                </div>
                <div>
                  <label className="required" style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.2rem" }}>
                    Employee Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP045"
                    value={newManager.employee_code}
                    onChange={(e) => setNewManager({ ...newManager, employee_code: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.2rem" }}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newManager.phone}
                  onChange={(e) => setNewManager({ ...newManager, phone: e.target.value })}
                  style={{ width: "100%", padding: "0.55rem" }}
                />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label className="required" style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.2rem" }}>
                  Assign to Branch:
                </label>
                <select
                  required
                  value={newManager.branch_id}
                  onChange={(e) => setNewManager({ ...newManager, branch_id: e.target.value })}
                  style={{ width: "100%", padding: "0.55rem", fontSize: "0.9rem" }}
                >
                  <option value="">-- Select active branch --</option>
                  {branches.filter((b) => b.is_active).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name} ({b.branch_code}) &middot; {b.city || "Tamil Nadu"}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={creating || !newManager.branch_id}>
                  {creating ? "Creating..." : "Create Manager"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
