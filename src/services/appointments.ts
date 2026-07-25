import type { Appointment, BookingData, RescheduleData } from "@/types/appointment";

const MOCK_DOCTORS = [
  { id: "d1", name: "Dr. Sarah Chen", specialty: "Cardiology" },
  { id: "d2", name: "Dr. James Wilson", specialty: "Dermatology" },
  { id: "d3", name: "Dr. Maria Rodriguez", specialty: "Pediatrics" },
  { id: "d4", name: "Dr. Robert Brown", specialty: "Orthopedics" },
  { id: "d5", name: "Dr. Emily Davis", specialty: "Neurology" },
  { id: "d6", name: "Dr. Michael Lee", specialty: "Ophthalmology" },
  { id: "d7", name: "Dr. Lisa Martinez", specialty: "Cardiology" },
  { id: "d8", name: "Dr. David Kim", specialty: "Pediatrics" },
];

const MOCK_PATIENTS = [
  { id: "p1", name: "Emma Wilson" },
  { id: "p2", name: "James Rodriguez" },
  { id: "p3", name: "Sarah Thompson" },
  { id: "p4", name: "Michael Brown" },
  { id: "p5", name: "Lisa Anderson" },
  { id: "p6", name: "Robert Taylor" },
  { id: "p7", name: "Emily Davis" },
  { id: "p8", name: "David Martinez" },
];

let MOCK_APPOINTMENTS: Appointment[] = [
  { id: "a1", patientId: "p1", patientName: "Emma Wilson", doctorId: "d1", doctorName: "Dr. Sarah Chen", specialty: "Cardiology", date: "2026-07-25", time: "09:00", duration: 30, status: "confirmed", type: "consultation", reason: "Chest pain evaluation", createdAt: "2026-07-20" },
  { id: "a2", patientId: "p2", patientName: "James Rodriguez", doctorId: "d1", doctorName: "Dr. Sarah Chen", specialty: "Cardiology", date: "2026-07-25", time: "10:00", duration: 30, status: "confirmed", type: "follow-up", reason: "Follow-up blood pressure", createdAt: "2026-07-18" },
  { id: "a3", patientId: "p3", patientName: "Sarah Thompson", doctorId: "d2", doctorName: "Dr. James Wilson", specialty: "Dermatology", date: "2026-07-25", time: "11:00", duration: 45, status: "completed", type: "checkup", reason: "Annual skin check", createdAt: "2026-07-15" },
  { id: "a4", patientId: "p4", patientName: "Michael Brown", doctorId: "d3", doctorName: "Dr. Maria Rodriguez", specialty: "Pediatrics", date: "2026-07-25", time: "14:00", duration: 30, status: "pending", type: "consultation", reason: "Fever and cough", createdAt: "2026-07-22" },
  { id: "a5", patientId: "p5", patientName: "Lisa Anderson", doctorId: "d4", doctorName: "Dr. Robert Brown", specialty: "Orthopedics", date: "2026-07-25", time: "15:00", duration: 60, status: "confirmed", type: "consultation", reason: "Knee pain consultation", createdAt: "2026-07-19" },
  { id: "a6", patientId: "p6", patientName: "Robert Taylor", doctorId: "d5", doctorName: "Dr. Emily Davis", specialty: "Neurology", date: "2026-07-26", time: "09:30", duration: 30, status: "pending", type: "consultation", reason: "Migraine evaluation", createdAt: "2026-07-23" },
  { id: "a7", patientId: "p7", patientName: "Emily Davis", doctorId: "d6", doctorName: "Dr. Michael Lee", specialty: "Ophthalmology", date: "2026-07-26", time: "11:00", duration: 30, status: "confirmed", type: "checkup", reason: "Vision problems", createdAt: "2026-07-21" },
  { id: "a8", patientId: "p8", patientName: "David Martinez", doctorId: "d7", doctorName: "Dr. Lisa Martinez", specialty: "Cardiology", date: "2026-07-24", time: "09:00", duration: 30, status: "completed", type: "follow-up", reason: "Blood pressure follow-up", createdAt: "2026-07-17" },
  { id: "a9", patientId: "p1", patientName: "Emma Wilson", doctorId: "d8", doctorName: "Dr. David Kim", specialty: "Pediatrics", date: "2026-07-24", time: "10:00", duration: 45, status: "cancelled", type: "consultation", reason: "Child vaccination", createdAt: "2026-07-16" },
  { id: "a10", patientId: "p2", patientName: "James Rodriguez", doctorId: "d2", doctorName: "Dr. James Wilson", specialty: "Dermatology", date: "2026-07-23", time: "14:00", duration: 30, status: "rejected", type: "consultation", reason: "Rash on arm", createdAt: "2026-07-14" },
  { id: "a11", patientId: "p3", patientName: "Sarah Thompson", doctorId: "d1", doctorName: "Dr. Sarah Chen", specialty: "Cardiology", date: "2026-07-28", time: "09:00", duration: 30, status: "pending", type: "checkup", reason: "Annual heart checkup", createdAt: "2026-07-24" },
  { id: "a12", patientId: "p4", patientName: "Michael Brown", doctorId: "d3", doctorName: "Dr. Maria Rodriguez", specialty: "Pediatrics", date: "2026-07-28", time: "10:00", duration: 30, status: "confirmed", type: "follow-up", reason: "Vaccination follow-up", createdAt: "2026-07-22" },
  { id: "a13", patientId: "p5", patientName: "Lisa Anderson", doctorId: "d4", doctorName: "Dr. Robert Brown", specialty: "Orthopedics", date: "2026-07-22", time: "11:00", duration: 45, status: "completed", type: "consultation", reason: "Back pain evaluation", notes: "Physical therapy recommended", createdAt: "2026-07-15" },
  { id: "a14", patientId: "p6", patientName: "Robert Taylor", doctorId: "d5", doctorName: "Dr. Emily Davis", specialty: "Neurology", date: "2026-07-21", time: "15:00", duration: 60, status: "completed", type: "consultation", reason: "Seizure evaluation", notes: "MRI scheduled for next week", createdAt: "2026-07-12" },
  { id: "a15", patientId: "p7", patientName: "Emily Davis", doctorId: "d6", doctorName: "Dr. Michael Lee", specialty: "Ophthalmology", date: "2026-07-20", time: "09:00", duration: 30, status: "cancelled", type: "checkup", reason: "Eye exam", createdAt: "2026-07-10" },
  { id: "a16", patientId: "p8", patientName: "David Martinez", doctorId: "d7", doctorName: "Dr. Lisa Martinez", specialty: "Cardiology", date: "2026-07-29", time: "14:00", duration: 30, status: "pending", type: "consultation", reason: "Heart palpitations", createdAt: "2026-07-25" },
  { id: "a17", patientId: "p1", patientName: "Emma Wilson", doctorId: "d1", doctorName: "Dr. Sarah Chen", specialty: "Cardiology", date: "2026-07-30", time: "09:00", duration: 30, status: "pending", type: "follow-up", reason: "Cholesterol check", createdAt: "2026-07-25" },
  { id: "a18", patientId: "p2", patientName: "James Rodriguez", doctorId: "d8", doctorName: "Dr. David Kim", specialty: "Pediatrics", date: "2026-07-19", time: "10:00", duration: 30, status: "completed", type: "checkup", reason: "Annual checkup", createdAt: "2026-07-08" },
  { id: "a19", patientId: "p3", patientName: "Sarah Thompson", doctorId: "d2", doctorName: "Dr. James Wilson", specialty: "Dermatology", date: "2026-07-31", time: "11:00", duration: 30, status: "pending", type: "consultation", reason: "Acne treatment", createdAt: "2026-07-25" },
  { id: "a20", patientId: "p4", patientName: "Michael Brown", doctorId: "d4", doctorName: "Dr. Robert Brown", specialty: "Orthopedics", date: "2026-07-18", time: "15:00", duration: 45, status: "completed", type: "emergency", reason: "Sports injury", notes: "X-ray normal, prescribed rest", createdAt: "2026-07-18" },
];

export const appointmentService = {
  getDoctors() {
    return MOCK_DOCTORS;
  },

  getSpecialties() {
    return [...new Set(MOCK_DOCTORS.map((d) => d.specialty))];
  },

  getDoctorsBySpecialty(specialty: string) {
    if (specialty === "all") return MOCK_DOCTORS;
    return MOCK_DOCTORS.filter((d) => d.specialty === specialty);
  },

  getAppointments() {
    return MOCK_APPOINTMENTS;
  },

  getAppointmentById(id: string) {
    return MOCK_APPOINTMENTS.find((a) => a.id === id);
  },

  getAppointmentsByPatient(patientId: string) {
    return MOCK_APPOINTMENTS.filter((a) => a.patientId === patientId);
  },

  getAppointmentsByDoctor(doctorId: string) {
    return MOCK_APPOINTMENTS.filter((a) => a.doctorId === doctorId);
  },

  getTodaysAppointments() {
    const today = "2026-07-25";
    return MOCK_APPOINTMENTS.filter((a) => a.date === today);
  },

  getTodaysAppointmentsByDoctor(doctorId: string) {
    const today = "2026-07-25";
    return MOCK_APPOINTMENTS.filter((a) => a.date === today && a.doctorId === doctorId);
  },

  bookAppointment(data: BookingData) {
    const doctor = MOCK_DOCTORS.find((d) => d.id === data.doctorId);
    if (!doctor) throw new Error("Doctor not found");
    const patient = MOCK_PATIENTS[0];
    if (!patient) throw new Error("No patient found");
    const newAppointment: Appointment = {
      id: `a${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      date: data.date,
      time: data.time,
      duration: 30,
      status: "pending",
      type: data.type,
      reason: data.reason,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    MOCK_APPOINTMENTS = [newAppointment, ...MOCK_APPOINTMENTS];
    return newAppointment;
  },

  cancelAppointment(id: string, reason?: string) {
    const appt = MOCK_APPOINTMENTS.find((a) => a.id === id);
    if (appt) {
      appt.status = "cancelled";
      if (reason) appt.notes = reason;
    }
    return appt;
  },

  rescheduleAppointment(id: string, data: RescheduleData) {
    const appt = MOCK_APPOINTMENTS.find((a) => a.id === id);
    if (appt) {
      appt.date = data.date;
      appt.time = data.time;
    }
    return appt;
  },

  confirmAppointment(id: string) {
    const appt = MOCK_APPOINTMENTS.find((a) => a.id === id);
    if (appt) appt.status = "confirmed";
    return appt;
  },

  rejectAppointment(id: string, reason?: string) {
    const appt = MOCK_APPOINTMENTS.find((a) => a.id === id);
    if (appt) {
      appt.status = "rejected";
      if (reason) appt.notes = reason;
    }
    return appt;
  },

  markCompleted(id: string, notes?: string) {
    const appt = MOCK_APPOINTMENTS.find((a) => a.id === id);
    if (appt) {
      appt.status = "completed";
      if (notes) appt.notes = notes;
    }
    return appt;
  },

  assignDoctor(id: string, doctorId: string) {
    const appt = MOCK_APPOINTMENTS.find((a) => a.id === id);
    const doctor = MOCK_DOCTORS.find((d) => d.id === doctorId);
    if (appt && doctor) {
      appt.doctorId = doctor.id;
      appt.doctorName = doctor.name;
      appt.specialty = doctor.specialty;
    }
    return appt;
  },

  changeTime(id: string, time: string, date?: string) {
    const appt = MOCK_APPOINTMENTS.find((a) => a.id === id);
    if (appt) {
      appt.time = time;
      if (date) appt.date = date;
    }
    return appt;
  },

  getStatusCounts(appointments: Appointment[]) {
    return {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "pending").length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      completed: appointments.filter((a) => a.status === "completed").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
      rejected: appointments.filter((a) => a.status === "rejected").length,
    };
  },
};
