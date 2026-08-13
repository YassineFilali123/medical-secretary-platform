export type DoctorInfo = {
  id: string;
  name: string;
  email: string;
  specialty: string;
  phone: string;
  bio: string;
  clinicName: string;
  clinicAddress: string;
};

export type AppointmentStatus = "scheduled" | "in-progress" | "completed" | "cancelled";
export type AppointmentType = "consultation" | "follow-up" | "emergency" | "checkup";

export type DoctorAppointment = {
  id: string;
  patientName: string;
  patientId: string;
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  reason: string;
  notes?: string;
  type: AppointmentType;
};

export type DoctorPatient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  lastVisit: string;
  upcomingAppointment?: string;
  condition: string;
};

export type MedicalRecord = {
  id: string;
  patientId: string;
  date: string;
  diagnosis: string;
  prescription: string;
  notes: string;
};

/**
 * Doctor-facing conversation status.
 *
 * "transferred" means a secretary took the conversation over; "active" means
 * it is still with the AI assistant. The mapping from the stored live_chat
 * status lives in DoctorConversationController.
 *
 * The conversation and message shapes themselves are defined next to the API
 * that returns them, in @/services/doctor-conversations.
 */
export type AiConversationStatus = "active" | "closed" | "transferred" | "waiting";

export type AvailabilitySlot = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotDuration: number;
};

export type VacationDay = {
  id: string;
  date: string;
  reason: string;
};

export type DoctorNotification = {
  id: string;
  type: "appointment" | "emergency" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
  urgent: boolean;
};

export type WeeklyStat = {
  day: string;
  appointments: number;
  completed: number;
};
