import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_HOME = {
  APPLICANT: "/applicant/dashboard",
  MANAGER: "/manager/dashboard",
  ADMIN: "/admin/dashboard",
};

const ROLE_PROFILE = {
  APPLICANT: "/applicant/profile",
  MANAGER: "/manager/dashboard",
  ADMIN: "/admin/dashboard",
};

/**
 * Consistent header for every authenticated dashboard (Applicant/Manager/
 * Admin). `links` are the role-specific nav items; profile/logout stay the
 * same shape across all three roles per the spec's "Common Dashboard
 * Header" section.
 */
export default function DashboardHeader({ links = [], initials = "U" }) {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to={ROLE_HOME[role] || "/"} className="navbar-logo">Meridian Trust</Link>
        <div className="navbar-links">
          {links.map((link) => (
            <Link key={link.to} to={link.to}>{link.label}</Link>
          ))}
        </div>
      </div>

      <div className="navbar-right">
        <button className="icon-btn" aria-label="Notifications" title="Notifications">
          🔔
          <span className="notif-dot" />
        </button>

        <div className="profile-menu-wrap" ref={menuRef}>
          <button className="avatar-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Profile menu">
            {initials}
          </button>
          {menuOpen && (
            <div className="profile-dropdown">
              <Link to={ROLE_PROFILE[role] || "/"} onClick={() => setMenuOpen(false)}>Profile</Link>
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
