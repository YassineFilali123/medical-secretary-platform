import { lazy, Suspense } from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleRoute } from "@/routes/RoleRoute";
import { PublicRoute } from "@/routes/PublicRoute";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import NotFoundPage from "@/pages/NotFoundPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";

const AdminDashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const UserManagementPage = lazy(() => import("@/pages/admin/UserManagementPage"));
const UserDetailsPage = lazy(() => import("@/pages/admin/UserDetailsPage"));
const RolesAndPermissionsPage = lazy(() => import("@/pages/admin/RolesAndPermissionsPage"));
const AiConfigurationPage = lazy(() => import("@/pages/admin/AiConfigurationPage"));
const ConversationScenariosPage = lazy(() => import("@/pages/admin/ConversationScenariosPage"));
const FaqManagementPage = lazy(() => import("@/pages/admin/FaqManagementPage"));
const SpecialtiesPage = lazy(() => import("@/pages/admin/SpecialtiesPage"));
const AdminDoctorRatingsPage = lazy(() => import("@/pages/admin/DoctorRatingsPage"));
const StatisticsPage = lazy(() => import("@/pages/admin/StatisticsPage"));
const SystemSettingsPage = lazy(() => import("@/pages/admin/SystemSettingsPage"));
const AdminNotificationsPage = lazy(() => import("@/pages/admin/NotificationsPage"));
const AdminProfilePage = lazy(() => import("@/pages/admin/ProfilePage"));

const DoctorDashboardPage = lazy(() => import("@/pages/doctor/DashboardPage"));
const SchedulePage = lazy(() => import("@/pages/doctor/SchedulePage"));
const DoctorCalendarPage = lazy(() => import("@/pages/doctor/CalendarPage"));
const TodaysAppointmentsPage = lazy(() => import("@/pages/doctor/TodaysAppointmentsPage"));
const DoctorPatientsPage = lazy(() => import("@/pages/doctor/PatientsPage"));
const PatientDetailsPage = lazy(() => import("@/pages/doctor/PatientDetailsPage"));
const DoctorAiConversationsPage = lazy(() => import("@/pages/doctor/AiConversationsPage"));
const DoctorAiConversationDetailPage = lazy(() => import("@/pages/doctor/AiConversationDetailPage"));
const AvailabilityPage = lazy(() => import("@/pages/doctor/AvailabilityPage"));
const DoctorNotificationsPage = lazy(() => import("@/pages/doctor/NotificationsPage"));
const DoctorProfilePage = lazy(() => import("@/pages/doctor/ProfilePage"));
const DoctorSettingsPage = lazy(() => import("@/pages/doctor/SettingsPage"));

const SecretaryDashboardPage = lazy(() => import("@/pages/secretary/DashboardPage"));
const AppointmentManagementPage = lazy(() => import("@/pages/secretary/AppointmentManagementPage"));
const SecretaryCalendarPage = lazy(() => import("@/pages/secretary/CalendarPage"));
const SecretaryNotificationsPage = lazy(() => import("@/pages/secretary/NotificationsPage"));
const SecretaryProfilePage = lazy(() => import("@/pages/secretary/ProfilePage"));
const SecretarySettingsPage = lazy(() => import("@/pages/secretary/SettingsPage"));
const ActiveConversationsPage = lazy(() => import("@/pages/secretary/ActiveConversationsPage"));
const ScheduleAdjustmentsPage = lazy(() => import("@/pages/secretary/ScheduleAdjustmentsPage"));
const SecretaryDocumentRequestsPage = lazy(() => import("@/pages/secretary/DocumentRequestsPage"));
const SecretaryFollowUpsPage = lazy(() => import("@/pages/secretary/FollowUpsPage"));
const SecretaryPatientLiveChatPage = lazy(() => import("@/pages/secretary/PatientLiveChatPage"));
const LiveConsultationPage = lazy(() => import("@/pages/doctor/LiveConsultationPage"));

const PatientDashboardPage = lazy(() => import("@/pages/patient/DashboardPage"));
const BookAppointmentPage = lazy(() => import("@/pages/patient/BookAppointmentPage"));
const MyAppointmentsPage = lazy(() => import("@/pages/patient/MyAppointmentsPage"));
const AppointmentDetailsPage = lazy(() => import("@/pages/patient/AppointmentDetailsPage"));
const AiAssistantPage = lazy(() => import("@/pages/patient/AiAssistantPage"));
const DocumentsPage = lazy(() => import("@/pages/patient/DocumentsPage"));
const PatientFollowUpsPage = lazy(() => import("@/pages/patient/PatientFollowUpsPage"));
const PatientNotificationsPage = lazy(() => import("@/pages/patient/NotificationsPage"));
const PatientProfilePage = lazy(() => import("@/pages/patient/ProfilePage"));
const PatientRatingsPage = lazy(() => import("@/pages/patient/RatingsPage"));
const PatientSettingsPage = lazy(() => import("@/pages/patient/SettingsPage"));

const SuspenseWrapper = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Outlet />
  </Suspense>
);

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path={ROUTES.HOME} element={<HomePage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route element={<SuspenseWrapper />}>
              {/* Admin pages are gated on the role, not just on being signed
                  in. The backend enforces this independently; this only keeps
                  non-admins from landing on a page of permission errors. */}
              <Route element={<RoleRoute allow={["admin"]} />}>
                <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
                <Route path={ROUTES.ADMIN_USERS} element={<UserManagementPage />} />
                <Route path={ROUTES.ADMIN_USER_DETAIL} element={<UserDetailsPage />} />
                <Route path={ROUTES.ADMIN_ROLES} element={<RolesAndPermissionsPage />} />
                <Route path={ROUTES.ADMIN_AI_CONFIG} element={<AiConfigurationPage />} />
                <Route path={ROUTES.ADMIN_SCENARIOS} element={<ConversationScenariosPage />} />
                <Route path={ROUTES.ADMIN_FAQS} element={<FaqManagementPage />} />
                <Route path={ROUTES.ADMIN_SPECIALTIES} element={<SpecialtiesPage />} />
                <Route path={ROUTES.ADMIN_RATINGS} element={<AdminDoctorRatingsPage />} />
                <Route path={ROUTES.ADMIN_STATISTICS} element={<StatisticsPage />} />
                <Route path={ROUTES.ADMIN_SETTINGS} element={<SystemSettingsPage />} />
                <Route path={ROUTES.ADMIN_NOTIFICATIONS} element={<AdminNotificationsPage />} />
                <Route path={ROUTES.ADMIN_PROFILE} element={<AdminProfilePage />} />
              </Route>
              <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />

              {/* Each role's pages are gated on that role. Previously any
                  signed-in user could open another role's dashboard; the API
                  refused the data, so the page simply filled with errors. */}
              <Route element={<RoleRoute allow={["doctor"]} />}>
              <Route path={ROUTES.DOCTOR_DASHBOARD} element={<DoctorDashboardPage />} />
              <Route path={ROUTES.DOCTOR_SCHEDULE} element={<SchedulePage />} />
              <Route path={ROUTES.DOCTOR_CALENDAR} element={<DoctorCalendarPage />} />
              <Route path={ROUTES.DOCTOR_TODAY} element={<TodaysAppointmentsPage />} />
              <Route path={ROUTES.DOCTOR_PATIENTS} element={<DoctorPatientsPage />} />
              <Route path={ROUTES.DOCTOR_PATIENT_DETAIL} element={<PatientDetailsPage />} />
              <Route path={ROUTES.DOCTOR_AI_CONVERSATIONS} element={<DoctorAiConversationsPage />} />
              <Route path={ROUTES.DOCTOR_AI_CONVERSATION_DETAIL} element={<DoctorAiConversationDetailPage />} />
              <Route path={ROUTES.DOCTOR_AVAILABILITY} element={<AvailabilityPage />} />
              <Route path={ROUTES.DOCTOR_LIVE_CONSULTATION} element={<LiveConsultationPage />} />
              <Route path={ROUTES.DOCTOR_NOTIFICATIONS} element={<DoctorNotificationsPage />} />
              <Route path={ROUTES.DOCTOR_PROFILE} element={<DoctorProfilePage />} />
              <Route path={ROUTES.DOCTOR_SETTINGS} element={<DoctorSettingsPage />} />
              </Route>

              <Route element={<RoleRoute allow={["secretary"]} />}>
              <Route path={ROUTES.SECRETARY_DASHBOARD} element={<SecretaryDashboardPage />} />
              <Route path={ROUTES.SECRETARY_APPOINTMENTS} element={<AppointmentManagementPage />} />
              <Route path={ROUTES.SECRETARY_SCHEDULE_ADJUSTMENTS} element={<ScheduleAdjustmentsPage />} />
              <Route path={ROUTES.SECRETARY_DOCUMENT_REQUESTS} element={<SecretaryDocumentRequestsPage />} />
              <Route path={ROUTES.SECRETARY_FOLLOWUPS} element={<SecretaryFollowUpsPage />} />
              <Route path={ROUTES.SECRETARY_PATIENT_LIVE_CHAT} element={<SecretaryPatientLiveChatPage />} />
              <Route path={ROUTES.SECRETARY_CALENDAR} element={<SecretaryCalendarPage />} />
              <Route path={ROUTES.SECRETARY_NOTIFICATIONS} element={<SecretaryNotificationsPage />} />
              <Route path={ROUTES.SECRETARY_PROFILE} element={<SecretaryProfilePage />} />
              <Route path={ROUTES.SECRETARY_SETTINGS} element={<SecretarySettingsPage />} />
              {/* Backed by the real live_chat data. The former MonitoringLayout
                  wrapper and its simulator-driven siblings were removed. */}
              <Route path={ROUTES.SECRETARY_ACTIVE_CONVERSATIONS} element={<ActiveConversationsPage />} />
              </Route>

              <Route element={<RoleRoute allow={["patient"]} />}>
              <Route path={ROUTES.PATIENT_DASHBOARD} element={<PatientDashboardPage />} />
              <Route path={ROUTES.PATIENT_BOOK} element={<BookAppointmentPage />} />
              <Route path={ROUTES.PATIENT_APPOINTMENTS} element={<MyAppointmentsPage />} />
              <Route path={ROUTES.PATIENT_APPOINTMENT_DETAIL} element={<AppointmentDetailsPage />} />
              <Route path={ROUTES.PATIENT_AI_ASSISTANT} element={<AiAssistantPage />} />
              <Route path={ROUTES.PATIENT_DOCUMENTS} element={<DocumentsPage />} />
                            <Route path={ROUTES.PATIENT_FOLLOWUPS} element={<PatientFollowUpsPage />} />
              <Route path={ROUTES.PATIENT_NOTIFICATIONS} element={<PatientNotificationsPage />} />
              <Route path={ROUTES.PATIENT_PROFILE} element={<PatientProfilePage />} />
              <Route path={ROUTES.PATIENT_RATINGS} element={<PatientRatingsPage />} />
              <Route path={ROUTES.PATIENT_SETTINGS} element={<PatientSettingsPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
