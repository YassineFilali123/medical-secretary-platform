/** Doctor API service – delegates to the mock doctor service. */
import { doctorService as mockDoctor } from "@/services/doctor";
import type { AvailabilitySlot, VacationDay } from "@/types/doctor";

export const doctorService = {
  getProfile: () => mockDoctor.getProfile(),

  getTodaysAppointments: () => mockDoctor.getTodaysAppointments(),

  getUpcomingAppointments: () => mockDoctor.getUpcomingAppointments(),

  getAllAppointments: () => mockDoctor.getAllAppointments(),

  getAppointmentById: (id: string) => mockDoctor.getAppointmentById(id),

  getAppointmentsByDate: (date: string) => mockDoctor.getAppointmentsByDate(date),

  getPatients: () => mockDoctor.getPatients(),

  getPatientById: (id: string) => mockDoctor.getPatientById(id),

  getPatientRecords: (patientId: string) => mockDoctor.getPatientRecords(patientId),

  getPatientAppointments: (patientId: string) => mockDoctor.getPatientAppointments(patientId),

  getConversations: () => mockDoctor.getConversations(),

  getConversationById: (id: string) => mockDoctor.getConversationById(id),

  getAvailability: () => mockDoctor.getAvailability(),

  updateAvailability: (slots: AvailabilitySlot[]) => mockDoctor.updateAvailability(slots),

  getVacations: () => mockDoctor.getVacations(),

  addVacation: (vacation: VacationDay) => mockDoctor.addVacation(vacation),

  removeVacation: (id: string) => mockDoctor.removeVacation(id),

  getNotifications: () => mockDoctor.getNotifications(),

  markNotificationRead: (id: string) => mockDoctor.markNotificationRead(id),

  getWeeklyStats: () => mockDoctor.getWeeklyStats(),

  getDayName: (dayIndex: number) => mockDoctor.getDayName(dayIndex),

  updateProfile: (data: Parameters<typeof mockDoctor.updateProfile>[0]) => mockDoctor.updateProfile(data),
};
