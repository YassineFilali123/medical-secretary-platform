/** Appointment API service – delegates to the mock appointment service. */
import { appointmentService as mockAppointments } from "@/services/appointments";
import type { BookingData, RescheduleData } from "@/types/appointment";
import type { Appointment } from "@/types/appointment";

export const appointmentService = {
  getDoctors: () => mockAppointments.getDoctors(),

  getSpecialties: () => mockAppointments.getSpecialties(),

  getDoctorsBySpecialty: (specialty: string) => mockAppointments.getDoctorsBySpecialty(specialty),

  getAppointments: () => mockAppointments.getAppointments(),

  getAppointmentById: (id: string) => mockAppointments.getAppointmentById(id),

  getAppointmentsByPatient: (patientId: string) => mockAppointments.getAppointmentsByPatient(patientId),

  getAppointmentsByDoctor: (doctorId: string) => mockAppointments.getAppointmentsByDoctor(doctorId),

  getTodaysAppointments: () => mockAppointments.getTodaysAppointments(),

  getTodaysAppointmentsByDoctor: (doctorId: string) => mockAppointments.getTodaysAppointmentsByDoctor(doctorId),

  bookAppointment: (data: BookingData) => mockAppointments.bookAppointment(data),

  cancelAppointment: (id: string, reason?: string) => mockAppointments.cancelAppointment(id, reason),

  rescheduleAppointment: (id: string, data: RescheduleData) => mockAppointments.rescheduleAppointment(id, data),

  confirmAppointment: (id: string) => mockAppointments.confirmAppointment(id),

  rejectAppointment: (id: string, reason?: string) => mockAppointments.rejectAppointment(id, reason),

  markCompleted: (id: string, notes?: string) => mockAppointments.markCompleted(id, notes),

  assignDoctor: (id: string, doctorId: string) => mockAppointments.assignDoctor(id, doctorId),

  changeTime: (id: string, time: string, date?: string) => mockAppointments.changeTime(id, time, date),

  getStatusCounts: (appointments: Appointment[]) => mockAppointments.getStatusCounts(appointments),
};
