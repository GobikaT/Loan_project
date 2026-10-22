import React, { useEffect, useState } from "react";
import DashboardHeader from "../../components/DashboardHeader";
import apiClient from "../../services/apiClient";

const NAV_LINKS = [
  { to: "/admin/districts", label: "Districts" },
  { to: "/admin/branches", label: "Branches" },
  { to: "/admin/managers", label: "Managers" },
];

export default function BranchManagement() {
  const [branches, setBranches] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create Branch Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBranch, setNewBranch] = useState({
    branch_code: "",
    branch_name: "",
    address: "",
    city: "",
    state: "Tamil Nadu",
    ifsc_code: "",
    contact_phone: "",
  });
  const [creating, setCreating] = useState(false);

  // Assign Manager Modal
  const [assigningBranch, setAssigningBranch] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      const [branchesRes, managersRes] = await Promise.all([
        apiClient.get("/api/admin/branches"),
        apiClient.get("/api/admin/managers"),
      ]);
      setBranches(branchesRes.data);
      setManagers(managersRes.data);
    } catch (err) {
      console.error("Failed to load branches/managers:", err);
      setError("Failed to load branch records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      await apiClient.post("/api/admin/branches", newBranch);
      setSuccess(`Branch '${newBranch.branch_name}' created successfully.`);
      setShowCreateModal(false);
      setNewBranch({
        branch_code: "",
        branch_name: "",
        address: "",
        city: "",
        state: "Tamil Nadu",
        ifsc_code: "",
        contact_phone: "",
      });
      await fetchData();
    } catch (err) {
      console.error("Failed to create branch:", err);
      setError(err?.response?.data?.detail || "Could not create branch.");
    } finally {
      setCreating(false);
    }
  };

  const handleAssignManager = async (e) => {
    e.preventDefault();
    if (!assigningBranch || !selectedManagerId) return;

    setAssigning(true);
    setError("");
    setSuccess("");
    try {
      await apiClient.post(`/api/admin/branches/${assigningBranch.id}/assign-manager`, {
        manager_id: Number(selectedManagerId),
      });
      setSuccess(`Manager assigned to ${assigningBranch.branch_name} successfully.`);
      setAssigningBranch(null);
      setSelectedManagerId("");
      await fetchData();
    } catch (err) {
      console.error("Failed to assign manager:", err);
      setError(err?.response?.data?.detail || "Could not assign manager to branch.");
    } finally {
      setAssigning(false);
    }
  };

  const handleToggleActive = async (branch) => {
    try {
      await apiClient.put(`/api/admin/branches/${branch.id}`, {
        is_active: !branch.is_active,
      });
      await fetchData();
    } catch (err) {
      console.error("Failed to update branch status:", err);
      alert("Failed to toggle branch status.");
    }
  };

  return (
    <div>
      <DashboardHeader links={NAV_LINKS} initials="A" />

      <div className="page" style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0 }}>Branch Management</h1>
            <p style={{ color: "var(--text-muted)", marginTop: "0.25rem", fontSize: "0.95rem" }}>
              Configure bank branches and manage designated Branch Manager mappings.
            </p>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => setShowCreateModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <span>+</span>
            <span>Create New Branch</span>
          </button>
        </div>

        {error && <div className="card" style={{ borderLeft: "5px solid crimson", marginBottom: "1rem" }}><p style={{ color: "crimson", margin: 0 }}>{error}</p></div>}
        {success && <div className="card" style={{ borderLeft: "5px solid #16a34a", background: "#f0fdf4", marginBottom: "1rem" }}><p style={{ color: "#166534", margin: 0, fontWeight: 600 }}>✓ {success}</p></div>}

        <div className="card" style={{ padding: "1.25rem" }}>
          <h2 style={{ margin: "0 0 1rem 0" }}>All Operating Branches ({branches.length})</h2>

          {loading ? (
            <p>Loading branch records...</p>
          ) : branches.length === 0 ? (
            <p>No branches configured. Click 'Create New Branch' to add one.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>Branch Name</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Code &amp; IFSC</th>
                    <th style={{ padding: "0.75rem 1rem" }}>City &amp; State</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Assigned Manager</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                        {b.branch_name}
                        {b.address && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>{b.address}</div>}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <strong>{b.branch_code}</strong>
                        {b.ifsc_code && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{b.ifsc_code}</div>}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {b.city || "N/A"}{b.state ? `, ${b.state}` : ""}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {b.manager_name ? (
                          <div>
                            <strong style={{ color: "#0369a1" }}>👤 {b.manager_name}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {b.manager_email} &middot; {b.manager_phone || b.manager_employee_code}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "#d97706", fontWeight: 600, fontSize: "0.85rem" }}>
                            ⚠️ Unassigned (No Manager)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background: b.is_active ? "#ecfdf5" : "#fee2e2",
                            color: b.is_active ? "#065f46" : "#991b1b",
                          }}
                        >
                          {b.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              setAssigningBranch(b);
                              setSelectedManagerId(b.manager_id ? String(b.manager_id) : "");
                            }}
                            style={{ fontSize: "0.8rem", padding: "0.35rem 0.65rem" }}
                          >
                            Assign Manager
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(b)}
                            style={{
                              fontSize: "0.8rem",
                              padding: "0.35rem 0.65rem",
                              background: b.is_active ? "#fef2f2" : "#f0fdf4",
                              border: "1px solid var(--border)",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            {b.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Branch Modal */}
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
              maxWidth: "550px",
              background: "#fff",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Create New Branch</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBranch}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div>
                  <label className="required" style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.2rem" }}>
                    Branch Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR-MDU"
                    value={newBranch.branch_code}
                    onChange={(e) => setNewBranch({ ...newBranch, branch_code: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem" }}
                  />
                </div>
                <div>
                  <label className="required" style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.2rem" }}>
                    Branch Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Madurai Main Branch"
                    value={newBranch.branch_name}
                    onChange={(e) => setNewBranch({ ...newBranch, branch_name: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.2rem" }}>City</label>
                  <input
                    type="text"
                    placeholder="e.g. Madurai"
                    value={newBranch.city}
                    onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.2rem" }}>State</label>
                  <input
                    type="text"
                    placeholder="Tamil Nadu"
                    value={newBranch.state}
                    onChange={(e) => setNewBranch({ ...newBranch, state: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.2rem" }}>IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. BKID0001234"
                    value={newBranch.ifsc_code}
                    onChange={(e) => setNewBranch({ ...newBranch, ifsc_code: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.2rem" }}>Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 0452-2345678"
                    value={newBranch.contact_phone}
                    onChange={(e) => setNewBranch({ ...newBranch, contact_phone: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.2rem" }}>Address</label>
                <input
                  type="text"
                  placeholder="Street / Area Address"
                  value={newBranch.address}
                  onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                  style={{ width: "100%", padding: "0.55rem" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={creating}>
                  {creating ? "Creating..." : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Manager Modal */}
      {assigningBranch && (
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
          onClick={() => setAssigningBranch(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              background: "#fff",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Assign Manager to {assigningBranch.branch_name}</h3>
              <button
                type="button"
                onClick={() => setAssigningBranch(null)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignManager}>
              <div style={{ marginBottom: "1.25rem" }}>
                <label className="required" style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.35rem", fontWeight: 600 }}>
                  Select Designated Branch Manager:
                </label>
                <select
                  required
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", fontSize: "0.95rem" }}
                >
                  <option value="">-- Choose an active manager --</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.manager_name} ({m.employee_code}) &middot; {m.email}
                    </option>
                  ))}
                </select>
                <small style={{ color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>
                  Applications submitted to this branch will be automatically scoped and assigned to this manager.
                </small>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setAssigningBranch(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={assigning || !selectedManagerId}>
                  {assigning ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
