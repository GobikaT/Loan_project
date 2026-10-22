import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { loginApplicant, registerApplicant } from "../../services/authService";
import AuthCard from "../../components/AuthCard";

export default function ApplicantLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");

  // Register mode
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginApplicant(email, password);
      login(response.user, response.token);
    } catch (err) {
      setError(err?.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await registerApplicant({
        full_name: fullName,
        email,
        phone,
        password,
        date_of_birth: dob,
        address,
      });
      login(response.user, response.token);
    } catch (err) {
      setError(err?.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = mode === "login" ? handleLogin : handleRegister;

  return (
    <AuthCard
      mode={mode}
      setMode={setMode}
      role="Applicant"
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      onSubmit={handleSubmit}
      error={error}
      loading={loading}
      allowRegister={true}
      // Register fields
      fullName={fullName}
      setFullName={setFullName}
      phone={phone}
      setPhone={setPhone}
      dob={dob}
      setDob={setDob}
      address={address}
      setAddress={setAddress}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
    />
  );
}