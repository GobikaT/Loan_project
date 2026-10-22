import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCard({
  mode = "login",
  setMode,
  role = "Applicant",
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  error,
  loading,
  allowRegister = true,
  fullName,
  setFullName,
  phone,
  setPhone,
  dob,
  setDob,
  address,
  setAddress,
  confirmPassword,
  setConfirmPassword,
}) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p>
            {mode === "login"
              ? `Login as ${role}`
              : `Register as ${role}`}
          </p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={onSubmit}>
          {mode === "register" && (
            <>
              <label className="required">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />

              <label className="required">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9999999999"
                required
              />

              <label className="required">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />

              <label>Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street"
              />
            </>
          )}

          <label className="required">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />

          <label className="required">Password</label>
          <div className="password-input-group">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              className="show-password-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {mode === "register" && (
            <>
              <label className="required">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="auth-button"
          >
            {loading
              ? mode === "login"
                ? "Logging in..."
                : "Creating Account..."
              : mode === "login"
              ? "Login"
              : "Create Account"}
          </button>
        </form>

        {allowRegister && (
          <div className="auth-footer">
            {mode === "login" ? (
              <>
                <p>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setMode("register")}
                  >
                    Create one
                  </button>
                </p>
              </>
            ) : (
              <>
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setMode("login")}
                  >
                    Login
                  </button>
                </p>
              </>
            )}
          </div>
        )}

        <div className="auth-back">
          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/roles")}
          >
            ← Back to Role Selection
          </button>
        </div>
      </div>
    </div>
  );
}