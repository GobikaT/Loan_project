import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { loginManager } from "../../services/authService";
import AuthCard from "../../components/AuthCard";

export default function ManagerLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginManager(email, password);
      login(response.user, response.token);
    } catch (err) {
      setError(err?.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      mode="login"
      role="Manager"
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      onSubmit={handleLogin}
      error={error}
      loading={loading}
      allowRegister={false}
    />
  );
}