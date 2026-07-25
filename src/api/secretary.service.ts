/** Secretary API service – delegates to the mock secretary service. */
import { secretaryService as mockSecretary } from "@/services/secretary";

export const secretaryService = {
  getConversations: () => mockSecretary.getConversations(),

  getActiveConversations: () => mockSecretary.getActiveConversations(),

  getConversationById: (id: string) => mockSecretary.getConversationById(id),

  getConversationMessageCount: () => mockSecretary.getConversationMessageCount(),

  getAppointments: () => mockSecretary.getAppointments(),

  getAppointmentsByDate: (date: string) => mockSecretary.getAppointmentsByDate(date),

  getQueue: () => mockSecretary.getQueue(),

  getHighPriorityQueueCount: () => mockSecretary.getHighPriorityQueueCount(),

  getEmergencyCases: () => mockSecretary.getEmergencyCases(),

  getEmergencyCount: () => mockSecretary.getEmergencyCount(),

  getEmergencyCasesByStatus: (status: string) => mockSecretary.getEmergencyCasesByStatus(status),

  getAIConversations: () => mockSecretary.getAIConversations(),

  getAverageConfidence: () => mockSecretary.getAverageConfidence(),

  getEscalatedCount: () => mockSecretary.getEscalatedCount(),

  getCallLogs: () => mockSecretary.getCallLogs(),

  getMissedCallCount: () => mockSecretary.getMissedCallCount(),

  getNotifications: () => mockSecretary.getNotifications(),

  markNotificationRead: (id: string) => mockSecretary.markNotificationRead(id),

  getUnreadNotificationCount: () => mockSecretary.getUnreadNotificationCount(),

  resolveEmergency: (id: string) => mockSecretary.resolveEmergency(id),

  assignDoctorToEmergency: (id: string, doctorName: string) => mockSecretary.assignDoctorToEmergency(id, doctorName),

  assignDoctorToAppointment: (id: string, doctorName: string) => mockSecretary.assignDoctorToAppointment(id, doctorName),

  confirmAppointment: (id: string) => mockSecretary.confirmAppointment(id),

  cancelAppointment: (id: string) => mockSecretary.cancelAppointment(id),
};
