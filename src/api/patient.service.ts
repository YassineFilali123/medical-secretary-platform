/** Patient API service – delegates to the mock patient service. */
import { patientService as mockPatient } from "@/services/patient";
import type { ChatMessage } from "@/types/patient";

export const patientService = {
  getDoctors: () => mockPatient.getDoctors(),

  searchDoctors: (query: string) => mockPatient.searchDoctors(query),

  getDoctorsBySpecialty: (specialty: string) => mockPatient.getDoctorsBySpecialty(specialty),

  getSpecialties: () => mockPatient.getSpecialties(),

  getDoctorById: (id: string) => mockPatient.getDoctorById(id),

  getAppointments: () => mockPatient.getAppointments(),

  getAppointmentById: (id: string) => mockPatient.getAppointmentById(id),

  getUpcomingAppointments: () => mockPatient.getUpcomingAppointments(),

  getCompletedAppointments: () => mockPatient.getCompletedAppointments(),

  getCancelledAppointments: () => mockPatient.getCancelledAppointments(),

  getTodaysAppointments: () => mockPatient.getTodaysAppointments(),

  bookAppointment: (data: { doctorId: string; date: string; time: string; reason: string }) =>
    mockPatient.bookAppointment(data),

  cancelAppointment: (id: string) => mockPatient.cancelAppointment(id),

  getDocuments: () => mockPatient.getDocuments(),

  getNotifications: () => mockPatient.getNotifications(),

  markNotificationRead: (id: string) => mockPatient.markNotificationRead(id),

  getChatHistory: () => mockPatient.getChatHistory(),

  addChatMessage: (message: ChatMessage) => mockPatient.addChatMessage(message),

  getHealthTips: () => mockPatient.getHealthTips(),

  getRecentActivity: () => mockPatient.getRecentActivity(),
};
