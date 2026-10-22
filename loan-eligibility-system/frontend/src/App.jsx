import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

// Public Pages
import LandingPage from "./pages/LandingPage";
import RoleSelection from "./pages/RoleSelection";

// Auth Pages
import ApplicantLogin from "./pages/auth/ApplicantLogin";
import ManagerLogin from "./pages/auth/ManagerLogin";
import AdminLogin from "./pages/auth/AdminLogin";

// Applicant Pages
import ApplicantDashboard from "./pages/applicant/ApplicantDashboard";
import LoanSelection from "./pages/applicant/LoanSelection";
import PersonalLoanForm from "./pages/applicant/PersonalLoanForm";
import HomeLoanForm from "./pages/applicant/HomeLoanForm";
import EducationLoanForm from "./pages/applicant/EducationLoanForm";
import ApplicationTracking from "./pages/applicant/ApplicationTracking";
import DocumentUpload from "./pages/applicant/DocumentUpload";
import EMICalculator from "./pages/applicant/EMICalculator";

// Manager Pages
import ManagerDashboard from "./pages/manager/ManagerDashboard";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import DistrictManagement from "./pages/admin/DistrictManagement";
import BranchManagement from "./pages/admin/BranchManagement";
import ManagerManagement from "./pages/admin/ManagerManagement";

// Styles
import "./styles/app.css";

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* ===== PUBLIC ROUTES ===== */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/roles" element={<RoleSelection />} />

          {/* ===== AUTH ROUTES ===== */}
          <Route path="/applicant/login" element={<ApplicantLogin />} />
          <Route path="/manager/login" element={<ManagerLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* ===== APPLICANT ROUTES ===== */}
          <Route
            path="/applicant/dashboard"
            element={
              <ProtectedRoute>
                <ApplicantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/loan-selection"
            element={
              <ProtectedRoute>
                <LoanSelection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/personal-loan"
            element={
              <ProtectedRoute>
                <PersonalLoanForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/loan/personal"
            element={
              <ProtectedRoute>
                <PersonalLoanForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/home-loan"
            element={
              <ProtectedRoute>
                <HomeLoanForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/loan/home"
            element={
              <ProtectedRoute>
                <HomeLoanForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/education-loan"
            element={
              <ProtectedRoute>
                <EducationLoanForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/loan/education"
            element={
              <ProtectedRoute>
                <EducationLoanForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/document-upload"
            element={
              <ProtectedRoute>
                <DocumentUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/tracking"
            element={
              <ProtectedRoute>
                <ApplicationTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/emi-calculator"
            element={
              <ProtectedRoute>
                <EMICalculator />
              </ProtectedRoute>
            }
          />

          {/* ===== MANAGER ROUTES ===== */}
          <Route
            path="/manager/dashboard"
            element={
              <ProtectedRoute>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />

          {/* ===== ADMIN ROUTES ===== */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/districts"
            element={
              <ProtectedRoute>
                <DistrictManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/branches"
            element={
              <ProtectedRoute>
                <BranchManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/managers"
            element={
              <ProtectedRoute>
                <ManagerManagement />
              </ProtectedRoute>
            }
          />

          {/* ===== 404 CATCH ALL ===== */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;