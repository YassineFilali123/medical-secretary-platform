import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { PublicRoute } from "@/routes/PublicRoute";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import DoctorDashboard from "@/pages/dashboards/DoctorDashboard";
import SecretaryDashboard from "@/pages/dashboards/SecretaryDashboard";
import PatientDashboard from "@/pages/dashboards/PatientDashboard";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboard />} />
          <Route path={ROUTES.DOCTOR_DASHBOARD} element={<DoctorDashboard />} />
          <Route path={ROUTES.SECRETARY_DASHBOARD} element={<SecretaryDashboard />} />
          <Route path={ROUTES.PATIENT_DASHBOARD} element={<PatientDashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}
