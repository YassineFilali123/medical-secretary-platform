import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { authService } from "@/api/auth.service";
import { doctorService } from "@/api/doctor.service";
import { patientService } from "@/api/patient.service";
import { secretaryService } from "@/api/secretary.service";
import { adminService } from "@/api/admin.service";
import { statisticsService } from "@/api/statistics.service";
import { notificationService } from "@/api/notification.service";
import { chatService } from "@/api/chat.service";
import type { UserRole } from "@/models";
import type { LoginCredentials } from "@/types/auth";
import type { AvailabilitySlot } from "@/types/doctor";

// ── Auth ──────────────────────────────────────────────────────
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.all }),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; password: string; name: string; role: UserRole }) =>
      authService.register(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.all }),
  });
}

// ── Appointments ──────────────────────────────────────────────
// The react-query wrappers that lived here forwarded to a mock appointment
// store. Appointments are now real API calls; use `useAppointments` from
// @/hooks/useAppointments and `appointmentService` from @/services/appointments.

// ── Doctor ────────────────────────────────────────────────────
export function useDoctorProfile() {
  return useQuery({
    queryKey: queryKeys.doctors.profile(),
    queryFn: () => doctorService.getProfile(),
  });
}

export function useDoctorTodaysAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments.today(),
    queryFn: () => doctorService.getTodaysAppointments(),
  });
}

export function useDoctorPatients() {
  return useQuery({
    queryKey: queryKeys.doctors.patients("current"),
    queryFn: () => doctorService.getPatients(),
  });
}

export function useDoctorPatient(id: string) {
  return useQuery({
    queryKey: queryKeys.patients.detail(id),
    queryFn: () => doctorService.getPatientById(id),
    enabled: !!id,
  });
}

export function useDoctorAvailability() {
  return useQuery({
    queryKey: queryKeys.doctors.availability("current"),
    queryFn: () => doctorService.getAvailability(),
  });
}

export function useUpdateDoctorAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slots: AvailabilitySlot[]) => doctorService.updateAvailability(slots),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.doctors.all }),
  });
}

export function useDoctorVacations() {
  return useQuery({
    queryKey: queryKeys.doctors.vacations("current"),
    queryFn: () => doctorService.getVacations(),
  });
}

export function useAddVacation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vacation: { id: string; date: string; reason: string }) =>
      doctorService.addVacation(vacation),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.doctors.all }),
  });
}

export function useRemoveVacation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => doctorService.removeVacation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.doctors.all }),
  });
}

export function useDoctorConversations() {
  return useQuery({
    queryKey: queryKeys.doctors.conversations("current"),
    queryFn: () => doctorService.getConversations(),
  });
}

export function useDoctorWeeklyStats() {
  return useQuery({
    queryKey: queryKeys.doctors.weeklyStats("current"),
    queryFn: () => doctorService.getWeeklyStats(),
  });
}

export function useUpdateDoctorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => doctorService.updateProfile(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.doctors.profile() }),
  });
}

// ── Patient ───────────────────────────────────────────────────
export function usePatientDoctors() {
  return useQuery({
    queryKey: queryKeys.patients.doctors(),
    queryFn: () => patientService.getDoctors(),
  });
}

export function usePatientAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments.lists(),
    queryFn: () => patientService.getAppointments(),
  });
}

export function usePatientDocuments() {
  return useQuery({
    queryKey: queryKeys.patients.documents("current"),
    queryFn: () => patientService.getDocuments(),
  });
}

export function usePatientNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.byRole("patient"),
    queryFn: () => patientService.getNotifications(),
  });
}

export function usePatientHealthTips() {
  return useQuery({
    queryKey: queryKeys.patients.healthTips(),
    queryFn: () => patientService.getHealthTips(),
  });
}

export function usePatientRecentActivity() {
  return useQuery({
    queryKey: [...queryKeys.patients.all, "recentActivity"],
    queryFn: () => patientService.getRecentActivity(),
  });
}

export function useBookPatientAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { doctorId: string; date: string; time: string; reason: string }) =>
      patientService.bookAppointment(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
  });
}

// ── Secretary ─────────────────────────────────────────────────
export function useSecretaryConversations() {
  return useQuery({
    queryKey: queryKeys.secretary.conversations.all(),
    queryFn: () => secretaryService.getConversations(),
  });
}

export function useSecretaryConversation(id: string) {
  return useQuery({
    queryKey: queryKeys.secretary.conversations.detail(id),
    queryFn: () => secretaryService.getConversationById(id),
    enabled: !!id,
  });
}

export function useSecretaryAppointments(date?: string) {
  return useQuery({
    queryKey: date
      ? queryKeys.secretary.appointments.byDate(date)
      : queryKeys.secretary.appointments.all(),
    queryFn: () =>
      date ? secretaryService.getAppointmentsByDate(date) : secretaryService.getAppointments(),
  });
}

export function useSecretaryQueue() {
  return useQuery({
    queryKey: queryKeys.secretary.queue.all(),
    queryFn: () => secretaryService.getQueue(),
  });
}

export function useSecretaryEmergencies() {
  return useQuery({
    queryKey: queryKeys.secretary.emergencies.all(),
    queryFn: () => secretaryService.getEmergencyCases(),
  });
}

export function useResolveEmergency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => secretaryService.resolveEmergency(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.secretary.emergencies.all() }),
  });
}

export function useAssignDoctorToEmergency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, doctorName }: { id: string; doctorName: string }) =>
      secretaryService.assignDoctorToEmergency(id, doctorName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.secretary.emergencies.all() }),
  });
}

export function useSecretaryAiConversations() {
  return useQuery({
    queryKey: queryKeys.secretary.aiConversations.all(),
    queryFn: () => secretaryService.getAIConversations(),
  });
}

export function useSecretaryCallLogs() {
  return useQuery({
    queryKey: queryKeys.secretary.callLogs.all(),
    queryFn: () => secretaryService.getCallLogs(),
  });
}

export function useSecretaryConfirmAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => secretaryService.confirmAppointment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.secretary.appointments.all() }),
  });
}

export function useSecretaryCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => secretaryService.cancelAppointment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.secretary.appointments.all() }),
  });
}

// ── Admin ─────────────────────────────────────────────────────
export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.admin.users.all(),
    queryFn: () => adminService.getUsers(),
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: queryKeys.admin.users.detail(id),
    queryFn: () => adminService.getUserById(id),
    enabled: !!id,
  });
}

export function useAdminRoles() {
  return useQuery({
    queryKey: queryKeys.admin.roles.all(),
    queryFn: () => adminService.getRoles(),
  });
}

export function useAdminPermissions() {
  return useQuery({
    queryKey: queryKeys.admin.permissions.all(),
    queryFn: () => adminService.getPermissions(),
  });
}

export function useAdminAiParameters() {
  return useQuery({
    queryKey: queryKeys.admin.aiConfig.parameters(),
    queryFn: () => adminService.getAiParameters(),
  });
}

export function useAdminScenarios() {
  return useQuery({
    queryKey: queryKeys.admin.scenarios.all(),
    queryFn: () => adminService.getScenarios(),
  });
}

export function useAdminFaqs() {
  return useQuery({
    queryKey: queryKeys.admin.faqs.all(),
    queryFn: () => adminService.getFaqs(),
  });
}

export function useAdminFaqCategories() {
  return useQuery({
    queryKey: queryKeys.admin.faqs.categories(),
    queryFn: () => adminService.getFaqCategories(),
  });
}

export function useAdminActivityLogs() {
  return useQuery({
    queryKey: queryKeys.admin.activityLogs.all(),
    queryFn: () => adminService.getActivityLogs(),
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: queryKeys.admin.settings.all(),
    queryFn: () => adminService.getSettings(),
  });
}

export function useAdminSettingsByCategory(category: string) {
  return useQuery({
    queryKey: queryKeys.admin.settings.byCategory(category),
    queryFn: () => adminService.getSettingsByCategory(category),
    enabled: !!category,
  });
}

// ── Statistics ────────────────────────────────────────────────
export function useKpiCards() {
  return useQuery({
    queryKey: queryKeys.statistics.kpiCards(),
    queryFn: () => statisticsService.getKpiCards(),
  });
}

export function useDailyAppointments() {
  return useQuery({
    queryKey: queryKeys.statistics.dailyAppointments(),
    queryFn: () => statisticsService.getDailyAppointments(),
  });
}

export function useMonthlyAppointments() {
  return useQuery({
    queryKey: queryKeys.statistics.monthlyAppointments(),
    queryFn: () => statisticsService.getMonthlyAppointments(),
  });
}

export function useAppointmentStatusData() {
  return useQuery({
    queryKey: queryKeys.statistics.appointmentStatus(),
    queryFn: () => statisticsService.getAppointmentStatus(),
  });
}

export function useAiConversationStats() {
  return useQuery({
    queryKey: queryKeys.statistics.aiConversations(),
    queryFn: () => statisticsService.getAiConversations(),
  });
}

export function useAiPerformanceStats() {
  return useQuery({
    queryKey: queryKeys.statistics.aiPerformance(),
    queryFn: () => statisticsService.getAiPerformance(),
  });
}

export function useDoctorActivityStats() {
  return useQuery({
    queryKey: queryKeys.statistics.doctorActivity(),
    queryFn: () => statisticsService.getDoctorActivity(),
  });
}

export function usePatientGrowthStats() {
  return useQuery({
    queryKey: queryKeys.statistics.patientGrowth(),
    queryFn: () => statisticsService.getPatientGrowth(),
  });
}

export function useCallDistributionStats() {
  return useQuery({
    queryKey: queryKeys.statistics.callDistribution(),
    queryFn: () => statisticsService.getCallDistribution(),
  });
}

export function useSatisfactionStats() {
  return useQuery({
    queryKey: queryKeys.statistics.satisfaction(),
    queryFn: () => statisticsService.getSatisfaction(),
  });
}

export function useTopDoctors() {
  return useQuery({
    queryKey: queryKeys.statistics.topDoctors(),
    queryFn: () => statisticsService.getTopDoctors(),
  });
}

export function useCallAnalyticsStats() {
  return useQuery({
    queryKey: queryKeys.statistics.callAnalytics(),
    queryFn: () => statisticsService.getCallAnalytics(),
  });
}

export function useDoctorPerformanceStats() {
  return useQuery({
    queryKey: queryKeys.statistics.doctorPerformance(),
    queryFn: () => statisticsService.getDoctorPerformance(),
  });
}

// ── Notifications ─────────────────────────────────────────────
export function useNotifications(role: UserRole) {
  return useQuery({
    queryKey: queryKeys.notifications.byRole(role),
    queryFn: () => notificationService.getNotifications(role),
  });
}

export function useUnreadNotificationCount(role: UserRole) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(role),
    queryFn: () => notificationService.getUnreadCount(role),
  });
}

export function useMarkNotificationRead(role: UserRole) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => notificationService.markNotificationRead(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.byRole(role) }),
  });
}

// ── Chat ──────────────────────────────────────────────────────
export function useChatConversations() {
  return useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: () => chatService.getConversations(),
  });
}

export function useChatConversation(id: string) {
  return useQuery({
    queryKey: queryKeys.chat.conversation(id),
    queryFn: () => chatService.getConversation(id),
    enabled: !!id,
  });
}

export function useCreateChatConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (firstMessage: string) => chatService.createConversation(firstMessage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() }),
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) =>
      chatService.sendMessage(conversationId, content),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversation(variables.conversationId),
      });
    },
  });
}

export function useDeleteChatConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => chatService.deleteConversation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() }),
  });
}

export function useRenameChatConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) =>
      chatService.renameConversation(id, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() }),
  });
}
