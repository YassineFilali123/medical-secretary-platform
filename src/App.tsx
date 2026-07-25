import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { PublicRoute } from "@/routes/PublicRoute";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import DoctorDashboardPage from "@/pages/doctor/DashboardPage";
import SchedulePage from "@/pages/doctor/SchedulePage";
import CalendarPage from "@/pages/doctor/CalendarPage";
import TodaysAppointmentsPage from "@/pages/doctor/TodaysAppointmentsPage";
import PatientsPage from "@/pages/doctor/PatientsPage";
import PatientDetailsPage from "@/pages/doctor/PatientDetailsPage";
import AiConversationsPage from "@/pages/doctor/AiConversationsPage";
import AvailabilityPage from "@/pages/doctor/AvailabilityPage";
import DoctorNotificationsPage from "@/pages/doctor/NotificationsPage";
import DoctorProfilePage from "@/pages/doctor/ProfilePage";
import DoctorSettingsPage from "@/pages/doctor/SettingsPage";
import SecretaryDashboardPage from "@/pages/secretary/DashboardPage";
import LiveConversationsPage from "@/pages/secretary/LiveConversationsPage";
import AppointmentManagementPage from "@/pages/secretary/AppointmentManagementPage";
import PatientQueuePage from "@/pages/secretary/PatientQueuePage";
import EmergencyCasesPage from "@/pages/secretary/EmergencyCasesPage";
import SecretaryCalendarPage from "@/pages/secretary/CalendarPage";
import AiMonitoringPage from "@/pages/secretary/AiMonitoringPage";
import CallHistoryPage from "@/pages/secretary/CallHistoryPage";
import SecretaryNotificationsPage from "@/pages/secretary/NotificationsPage";
import SecretaryProfilePage from "@/pages/secretary/ProfilePage";
import SecretarySettingsPage from "@/pages/secretary/SettingsPage";
import PatientDashboardPage from "@/pages/patient/DashboardPage";
import BookAppointmentPage from "@/pages/patient/BookAppointmentPage";
import MyAppointmentsPage from "@/pages/patient/MyAppointmentsPage";
import AppointmentDetailsPage from "@/pages/patient/AppointmentDetailsPage";
import AiAssistantPage from "@/pages/patient/AiAssistantPage";
import DocumentsPage from "@/pages/patient/DocumentsPage";
import PatientNotificationsPage from "@/pages/patient/NotificationsPage";
import PatientProfilePage from "@/pages/patient/ProfilePage";
import PatientSettingsPage from "@/pages/patient/SettingsPage";

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
          <Route path={ROUTES.DOCTOR_DASHBOARD} element={<DoctorDashboardPage />} />
          <Route path={ROUTES.DOCTOR_SCHEDULE} element={<SchedulePage />} />
          <Route path={ROUTES.DOCTOR_CALENDAR} element={<CalendarPage />} />
          <Route path={ROUTES.DOCTOR_TODAY} element={<TodaysAppointmentsPage />} />
          <Route path={ROUTES.DOCTOR_PATIENTS} element={<PatientsPage />} />
          <Route path={ROUTES.DOCTOR_PATIENT_DETAIL} element={<PatientDetailsPage />} />
          <Route path={ROUTES.DOCTOR_AI_CONVERSATIONS} element={<AiConversationsPage />} />
          <Route path={ROUTES.DOCTOR_AVAILABILITY} element={<AvailabilityPage />} />
          <Route path={ROUTES.DOCTOR_NOTIFICATIONS} element={<DoctorNotificationsPage />} />
          <Route path={ROUTES.DOCTOR_PROFILE} element={<DoctorProfilePage />} />
          <Route path={ROUTES.DOCTOR_SETTINGS} element={<DoctorSettingsPage />} />
          <Route path={ROUTES.SECRETARY_DASHBOARD} element={<SecretaryDashboardPage />} />
          <Route path={ROUTES.SECRETARY_LIVE_CONVERSATIONS} element={<LiveConversationsPage />} />
          <Route path={ROUTES.SECRETARY_APPOINTMENTS} element={<AppointmentManagementPage />} />
          <Route path={ROUTES.SECRETARY_PATIENT_QUEUE} element={<PatientQueuePage />} />
          <Route path={ROUTES.SECRETARY_EMERGENCY_CASES} element={<EmergencyCasesPage />} />
          <Route path={ROUTES.SECRETARY_CALENDAR} element={<SecretaryCalendarPage />} />
          <Route path={ROUTES.SECRETARY_AI_MONITORING} element={<AiMonitoringPage />} />
          <Route path={ROUTES.SECRETARY_CALL_HISTORY} element={<CallHistoryPage />} />
          <Route path={ROUTES.SECRETARY_NOTIFICATIONS} element={<SecretaryNotificationsPage />} />
          <Route path={ROUTES.SECRETARY_PROFILE} element={<SecretaryProfilePage />} />
          <Route path={ROUTES.SECRETARY_SETTINGS} element={<SecretarySettingsPage />} />
          <Route path={ROUTES.PATIENT_DASHBOARD} element={<PatientDashboardPage />} />
          <Route path={ROUTES.PATIENT_BOOK} element={<BookAppointmentPage />} />
          <Route path={ROUTES.PATIENT_APPOINTMENTS} element={<MyAppointmentsPage />} />
          <Route path={ROUTES.PATIENT_APPOINTMENT_DETAIL} element={<AppointmentDetailsPage />} />
          <Route path={ROUTES.PATIENT_AI_ASSISTANT} element={<AiAssistantPage />} />
          <Route path={ROUTES.PATIENT_DOCUMENTS} element={<DocumentsPage />} />
          <Route path={ROUTES.PATIENT_NOTIFICATIONS} element={<PatientNotificationsPage />} />
          <Route path={ROUTES.PATIENT_PROFILE} element={<PatientProfilePage />} />
          <Route path={ROUTES.PATIENT_SETTINGS} element={<PatientSettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}
