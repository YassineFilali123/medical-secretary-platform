/** Statistics / Analytics API service – delegates to the mock analytics service. */
import { analyticsService as mockAnalytics } from "@/services/analytics";

export const statisticsService = {
  getKpiCards: () => mockAnalytics.getKpiCards(),

  getDailyAppointments: () => mockAnalytics.getDailyAppointments(),

  getMonthlyAppointments: () => mockAnalytics.getMonthlyAppointments(),

  getAppointmentStatus: () => mockAnalytics.getAppointmentStatus(),

  getAiConversations: () => mockAnalytics.getAiConversations(),

  getAiPerformance: () => mockAnalytics.getAiPerformance(),

  getDoctorActivity: () => mockAnalytics.getDoctorActivity(),

  getPatientGrowth: () => mockAnalytics.getPatientGrowth(),

  getCallDistribution: () => mockAnalytics.getCallDistribution(),

  getSatisfaction: () => mockAnalytics.getSatisfaction(),

  getTopDoctors: () => mockAnalytics.getTopDoctors(),

  getMostActivePatients: () => mockAnalytics.getMostActivePatients(),

  getRecentAppointments: () => mockAnalytics.getRecentAppointments(),

  getRecentAiConversations: () => mockAnalytics.getRecentAiConversations(),

  getCallAnalytics: () => mockAnalytics.getCallAnalytics(),

  getCallOutcomes: () => mockAnalytics.getCallOutcomes(),

  getAvgResponseTime: () => mockAnalytics.getAvgResponseTime(),

  getDoctorPerformance: () => mockAnalytics.getDoctorPerformance(),

  getAiConversationHours: () => mockAnalytics.getAiConversationHours(),

  getFilteredDateRange: (startDate: string, endDate: string) =>
    mockAnalytics.getFilteredDateRange(startDate, endDate),

  getExportData: (type: "excel" | "pdf" | "print") => mockAnalytics.getExportData(type),
};
