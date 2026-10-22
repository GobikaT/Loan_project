import apiClient from "./apiClient";

export async function registerApplicant({
  full_name,
  email,
  phone,
  password,
  date_of_birth,
  address,
}) {
  const { data } = await apiClient.post("/api/auth/register", {
    full_name,
    email,
    phone,
    password,
    date_of_birth,
    address: address || null,
  });
  
  // Return data for context to handle
  return {
    user: {
      id: data.id,
      email: data.email || email,
      full_name: data.full_name || full_name,
      phone: data.phone || phone,
      role: data.role || "APPLICANT",
    },
    token: data.access_token,
  };
}

export async function loginApplicant(email, password) {
  const { data } = await apiClient.post("/api/auth/login", {
    email,
    password,
  });
  
  return {
    user: {
      id: data.id,
      email: data.email || email,
      full_name: data.full_name || (email ? email.split("@")[0] : "Applicant"),
      phone: data.phone,
      role: data.role || "APPLICANT",
    },
    token: data.access_token,
  };
}

export async function loginManager(email, password) {
  const { data } = await apiClient.post("/api/auth/login", {
    email,
    password,
  });
  
  return {
    user: {
      id: data.id,
      email: data.email || email,
      full_name: data.full_name || "Manager",
      phone: data.phone,
      role: data.role || "MANAGER",
    },
    token: data.access_token,
  };
}

export async function loginAdmin(email, password) {
  const { data } = await apiClient.post("/api/auth/login", {
    email,
    password,
  });
  
  return {
    user: {
      id: data.id,
      email: data.email || email,
      full_name: data.full_name || "Admin",
      phone: data.phone,
      role: data.role || "ADMIN",
    },
    token: data.access_token,
  };
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
}

export function getRole() {
  const role = localStorage.getItem("role");
  if (role) return role;
  const user = localStorage.getItem("user");
  if (!user) return null;
  try {
    return JSON.parse(user).role;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

export function getUser() {
  const user = localStorage.getItem("user");
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}