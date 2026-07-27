import { lazy, Suspense } from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { PublicRoute } from "@/routes/PublicRoute";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import NotFoundPage from "@/pages/NotFoundPage";

const AdminDashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const UserManagementPage = lazy(() => import("@/pages/admin/UserManagementPage"));
const UserDetailsPage = lazy(() => import("@/pages/admin/UserDetailsPage"));
const RolesAndPermissionsPage = lazy(() => import("@/pages/admin/RolesAndPermissionsPage"));
const AiConfigurationPage = lazy(() => import("@/pages/admin/AiConfigurationPage"));
const ConversationScenariosPage = lazy(() => import("@/pages/admin/ConversationScenariosPage"));
const FaqManagementPage = lazy(() => import("@/pages/admin/FaqManagementPage"));
const SpecialtiesPage = lazy(() => import("@/pages/admin/SpecialtiesPage"));
const StatisticsPage = lazy(() => import("@/pages/admin/StatisticsPage"));
const ActivityLogsPage = lazy(() => import("@/pages/admin/ActivityLogsPage"));
const SystemSettingsPage = lazy(() => import("@/pages/admin/SystemSettingsPage"));
const AdminNotificationsPage = lazy(() => import("@/pages/admin/NotificationsPage"));
const AdminProfilePage = lazy(() => import("@/pages/admin/ProfilePage"));
const AdminAppointmentListPage = lazy(() => import("@/pages/admin/AppointmentListPage"));

const DoctorDashboardPage = lazy(() => import("@/pages/doctor/DashboardPage"));
const SchedulePage = lazy(() => import("@/pages/doctor/SchedulePage"));
const DoctorCalendarPage = lazy(() => import("@/pages/doctor/CalendarPage"));
const TodaysAppointmentsPage = lazy(() => import("@/pages/doctor/TodaysAppointmentsPage"));
const DoctorPatientsPage = lazy(() => import("@/pages/doctor/PatientsPage"));
const PatientDetailsPage = lazy(() => import("@/pages/doctor/PatientDetailsPage"));
const DoctorAiConversationsPage = lazy(() => import("@/pages/doctor/AiConversationsPage"));
const AvailabilityPage = lazy(() => import("@/pages/doctor/AvailabilityPage"));
const DoctorNotificationsPage = lazy(() => import("@/pages/doctor/NotificationsPage"));
const DoctorProfilePage = lazy(() => import("@/pages/doctor/ProfilePage"));
const DoctorSettingsPage = lazy(() => import("@/pages/doctor/SettingsPage"));

const SecretaryDashboardPage = lazy(() => import("@/pages/secretary/DashboardPage"));
const LiveConversationsPage = lazy(() => import("@/pages/secretary/LiveConversationsPage"));
const AppointmentManagementPage = lazy(() => import("@/pages/secretary/AppointmentManagementPage"));
const PatientQueuePage = lazy(() => import("@/pages/secretary/PatientQueuePage"));
const EmergencyCasesPage = lazy(() => import("@/pages/secretary/EmergencyCasesPage"));
const SecretaryCalendarPage = lazy(() => import("@/pages/secretary/CalendarPage"));
const AiMonitoringPage = lazy(() => import("@/pages/secretary/AiMonitoringPage"));
const CallHistoryPage = lazy(() => import("@/pages/secretary/CallHistoryPage"));
const SecretaryNotificationsPage = lazy(() => import("@/pages/secretary/NotificationsPage"));
const SecretaryProfilePage = lazy(() => import("@/pages/secretary/ProfilePage"));
const SecretarySettingsPage = lazy(() => import("@/pages/secretary/SettingsPage"));
const MonitoringLayout = lazy(() => import("@/pages/secretary/MonitoringLayout"));
const LiveDashboardPage = lazy(() => import("@/pages/secretary/LiveDashboardPage"));
const ActiveConversationsPage = lazy(() => import("@/pages/secretary/ActiveConversationsPage"));
const CallQueuePage = lazy(() => import("@/pages/secretary/CallQueuePage"));
const EmergencyQueuePage = lazy(() => import("@/pages/secretary/EmergencyQueuePage"));
const ConversationDetailPage = lazy(() => import("@/pages/secretary/ConversationDetailPage"));
const ScheduleAdjustmentsPage = lazy(() => import("@/pages/secretary/ScheduleAdjustmentsPage"));
const LiveConsultationPage = lazy(() => import("@/pages/doctor/LiveConsultationPage"));

const PatientDashboardPage = lazy(() => import("@/pages/patient/DashboardPage"));
const BookAppointmentPage = lazy(() => import("@/pages/patient/BookAppointmentPage"));
const MyAppointmentsPage = lazy(() => import("@/pages/patient/MyAppointmentsPage"));
const AppointmentDetailsPage = lazy(() => import("@/pages/patient/AppointmentDetailsPage"));
const AiAssistantPage = lazy(() => import("@/pages/patient/AiAssistantPage"));
const DocumentsPage = lazy(() => import("@/pages/patient/DocumentsPage"));
const PatientNotificationsPage = lazy(() => import("@/pages/patient/NotificationsPage"));
const PatientProfilePage = lazy(() => import("@/pages/patient/ProfilePage"));
const PatientSettingsPage = lazy(() => import("@/pages/patient/SettingsPage"));
const AiChatPage = lazy(() => import("@/pages/shared/AiChatPage"));
const AiAssistantHomePage = lazy(() => import("@/pages/shared/AiAssistantHomePage"));
const AiConversationPage = lazy(() => import("@/pages/shared/AiConversationPage"));
const AiConversationHistoryPage = lazy(() => import("@/pages/shared/AiConversationHistory"));

const AnalyticsDashboardPage = lazy(() => import("@/pages/analytics/AnalyticsDashboardPage"));
const AppointmentAnalyticsPage = lazy(() => import("@/pages/analytics/AppointmentAnalyticsPage"));
const AiAnalyticsPage = lazy(() => import("@/pages/analytics/AiAnalyticsPage"));
const PatientAnalyticsPage = lazy(() => import("@/pages/analytics/PatientAnalyticsPage"));
const DoctorAnalyticsPage = lazy(() => import("@/pages/analytics/DoctorAnalyticsPage"));
const CallAnalyticsPage = lazy(() => import("@/pages/analytics/CallAnalyticsPage"));

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
              <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
              <Route path={ROUTES.ADMIN_USERS} element={<UserManagementPage />} />
              <Route path={ROUTES.ADMIN_USER_DETAIL} element={<UserDetailsPage />} />
              <Route path={ROUTES.ADMIN_ROLES} element={<RolesAndPermissionsPage />} />
              <Route path={ROUTES.ADMIN_AI_CONFIG} element={<AiConfigurationPage />} />
              <Route path={ROUTES.ADMIN_SCENARIOS} element={<ConversationScenariosPage />} />
              <Route path={ROUTES.ADMIN_FAQS} element={<FaqManagementPage />} />
              <Route path={ROUTES.ADMIN_SPECIALTIES} element={<SpecialtiesPage />} />
              <Route path={ROUTES.ADMIN_STATISTICS} element={<StatisticsPage />} />
              <Route path={ROUTES.ADMIN_ACTIVITY_LOGS} element={<ActivityLogsPage />} />
              <Route path={ROUTES.ADMIN_SETTINGS} element={<SystemSettingsPage />} />
              <Route path={ROUTES.ADMIN_APPOINTMENTS} element={<AdminAppointmentListPage />} />
              <Route path={ROUTES.ADMIN_NOTIFICATIONS} element={<AdminNotificationsPage />} />
              <Route path={ROUTES.ADMIN_PROFILE} element={<AdminProfilePage />} />
              <Route path={ROUTES.AI_CHAT} element={<AiChatPage />} />
              <Route path={ROUTES.AI_ASSISTANT_HOME} element={<AiAssistantHomePage />} />
              <Route path={`${ROUTES.AI_ASSISTANT_CHAT}/:conversationId?`} element={<AiConversationPage />} />
              <Route path={ROUTES.AI_ASSISTANT_HISTORY} element={<AiConversationHistoryPage />} />

              <Route path={ROUTES.ANALYTICS_DASHBOARD} element={<AnalyticsDashboardPage />} />
              <Route path={ROUTES.ANALYTICS_APPOINTMENTS} element={<AppointmentAnalyticsPage />} />
              <Route path={ROUTES.ANALYTICS_AI} element={<AiAnalyticsPage />} />
              <Route path={ROUTES.ANALYTICS_PATIENTS} element={<PatientAnalyticsPage />} />
              <Route path={ROUTES.ANALYTICS_DOCTORS} element={<DoctorAnalyticsPage />} />
              <Route path={ROUTES.ANALYTICS_CALLS} element={<CallAnalyticsPage />} />

              <Route path={ROUTES.DOCTOR_DASHBOARD} element={<DoctorDashboardPage />} />
              <Route path={ROUTES.DOCTOR_SCHEDULE} element={<SchedulePage />} />
              <Route path={ROUTES.DOCTOR_CALENDAR} element={<DoctorCalendarPage />} />
              <Route path={ROUTES.DOCTOR_TODAY} element={<TodaysAppointmentsPage />} />
              <Route path={ROUTES.DOCTOR_PATIENTS} element={<DoctorPatientsPage />} />
              <Route path={ROUTES.DOCTOR_PATIENT_DETAIL} element={<PatientDetailsPage />} />
              <Route path={ROUTES.DOCTOR_AI_CONVERSATIONS} element={<DoctorAiConversationsPage />} />
              <Route path={ROUTES.DOCTOR_AVAILABILITY} element={<AvailabilityPage />} />
              <Route path={ROUTES.DOCTOR_LIVE_CONSULTATION} element={<LiveConsultationPage />} />
              <Route path={ROUTES.DOCTOR_NOTIFICATIONS} element={<DoctorNotificationsPage />} />
              <Route path={ROUTES.DOCTOR_PROFILE} element={<DoctorProfilePage />} />
              <Route path={ROUTES.DOCTOR_SETTINGS} element={<DoctorSettingsPage />} />

              <Route path={ROUTES.SECRETARY_DASHBOARD} element={<SecretaryDashboardPage />} />
              <Route path={ROUTES.SECRETARY_LIVE_CONVERSATIONS} element={<LiveConversationsPage />} />
              <Route path={ROUTES.SECRETARY_APPOINTMENTS} element={<AppointmentManagementPage />} />
              <Route path={ROUTES.SECRETARY_SCHEDULE_ADJUSTMENTS} element={<ScheduleAdjustmentsPage />} />
              <Route path={ROUTES.SECRETARY_PATIENT_QUEUE} element={<PatientQueuePage />} />
              <Route path={ROUTES.SECRETARY_EMERGENCY_CASES} element={<EmergencyCasesPage />} />
              <Route path={ROUTES.SECRETARY_CALENDAR} element={<SecretaryCalendarPage />} />
              <Route path={ROUTES.SECRETARY_AI_MONITORING} element={<AiMonitoringPage />} />
              <Route path={ROUTES.SECRETARY_CALL_HISTORY} element={<CallHistoryPage />} />
              <Route path={ROUTES.SECRETARY_NOTIFICATIONS} element={<SecretaryNotificationsPage />} />
              <Route path={ROUTES.SECRETARY_PROFILE} element={<SecretaryProfilePage />} />
              <Route path={ROUTES.SECRETARY_SETTINGS} element={<SecretarySettingsPage />} />

              <Route element={<MonitoringLayout />}>
                <Route path={ROUTES.SECRETARY_LIVE_DASHBOARD} element={<LiveDashboardPage />} />
                <Route path={ROUTES.SECRETARY_ACTIVE_CONVERSATIONS} element={<ActiveConversationsPage />} />
                <Route path={ROUTES.SECRETARY_CALL_QUEUE} element={<CallQueuePage />} />
                <Route path={ROUTES.SECRETARY_EMERGENCY_QUEUE} element={<EmergencyQueuePage />} />
                <Route path={ROUTES.SECRETARY_CONVERSATION_DETAIL} element={<ConversationDetailPage />} />
              </Route>

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
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
