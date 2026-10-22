import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("token") || localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");
    
    if (stored && storedUser) {
      try {
        setToken(stored);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Failed to parse user", err);
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    console.log("Login called with role:", userData?.role);
    
    setUser(userData);
    setToken(authToken);
    
    localStorage.setItem("token", authToken);
    localStorage.setItem("access_token", authToken);
    localStorage.setItem("user", JSON.stringify(userData));
    if (userData?.role) {
      localStorage.setItem("role", userData.role);
    }

    // Redirect based on role
    setTimeout(() => {
      if (userData?.role === "APPLICANT") {
        window.location.href = "/applicant/dashboard";
      } else if (userData?.role === "MANAGER") {
        window.location.href = "/manager/dashboard";
      } else if (userData?.role === "ADMIN") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/";
      }
    }, 100);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}