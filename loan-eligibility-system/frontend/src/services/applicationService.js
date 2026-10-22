import apiClient from "./apiClient";

export async function createPersonalLoan(payload) {
  const { data } = await apiClient.post("/api/applicant/applications/personal", payload);
  return data;
}

export async function createPersonalLoanWithDocs(formData) {
  const { data } = await apiClient.post("/api/applicant/applications/personal-with-docs", formData);
  return data;
}

export async function createHomeLoan(payload) {
  const { data } = await apiClient.post("/api/applicant/applications/home", payload);
  return data;
}

export async function createHomeLoanWithDocs(formData) {
  const { data } = await apiClient.post("/api/applicant/applications/home-with-docs", formData);
  return data;
}

export async function createEducationLoan(payload) {
  const { data } = await apiClient.post("/api/applicant/applications/education", payload);
  return data;
}

export async function createEducationLoanWithDocs(formData) {
  const { data } = await apiClient.post("/api/applicant/applications/education-with-docs", formData);
  return data;
}

export async function uploadApplicationDocuments(applicationId, files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const { data } = await apiClient.post(`/api/applicant/applications/${applicationId}/upload-documents`, formData);
  return data;
}

export async function getExtractedFields(applicationId) {
  const { data } = await apiClient.get(`/api/applicant/applications/${applicationId}/extracted-fields`);
  return data;
}

export async function getAiPrediction(applicationId) {
  const { data } = await apiClient.get(`/api/applicant/applications/${applicationId}/ai-prediction`);
  return data;
}

export async function getRiskAssessment(applicationId) {
  const { data } = await apiClient.get(`/api/applicant/applications/${applicationId}/risk-assessment`);
  return data;
}

export async function listMyApplications() {
  const { data } = await apiClient.get("/api/applicant/applications");
  return data;
}

export async function getApplicantBranches() {
  const { data } = await apiClient.get("/api/applicant/branches");
  return data;
}

export async function getMyApplication(id) {
  const { data } = await apiClient.get(`/api/applicant/applications/${id}`);
  return data;
}

export async function getMyProfile() {
  const { data } = await apiClient.get("/api/applicant/me");
  return data;
}

export async function getDashboardSummary() {
  const { data } = await apiClient.get("/api/applicant/dashboard-summary");
  return data;
}
