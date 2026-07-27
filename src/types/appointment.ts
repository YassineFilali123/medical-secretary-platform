export type AppointmentStatus =
  | "pending"
  | "confirmed"
  /** A consultation the doctor has started but not yet closed out. */
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

export type AppointmentType = "consultation" | "follow-up" | "checkup" | "emergency";

/** Statuses that still hold their slot — mirrors `active_slot` in the schema. */
export const ACTIVE_STATUSES: AppointmentStatus[] = ["pending", "confirmed", "in_progress", "completed"];

/** Statuses a patient or secretary can still act on. */
export const OPEN_STATUSES: AppointmentStatus[] = ["pending", "confirmed"];

export type Appointment = {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  specialty: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
  /** HH:MM */
  endTime: string;
  duration: number;
  status: AppointmentStatus;
  type: AppointmentType;
  reason: string;
  /** Why it was cancelled or rejected. */
  decisionReason: string | null;
  /** Clinical notes. Always null for a patient — the API withholds them. */
  notes: string | null;
  createdAt: string;
};

export type Doctor = {
  id: number;
  name: string;
  specialtyId: number | null;
  specialty: string;
  avatarUrl: string | null;
  bio: string | null;
  clinicName: string | null;
  clinicAddress: string | null;
};

export type Patient = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
};

/** Server-side filters for GET /api/appointments. */
export type AppointmentQuery = {
  status?: AppointmentStatus | "all";
  from?: string;
  to?: string;
  doctorId?: number;
  patientId?: number;
  q?: string;
  limit?: number;
};

export type BookingData = {
  doctorId: number;
  date: string;
  /** HH:MM — must be one of the doctor's offered slot starts. */
  time: string;
  reason: string;
  type: AppointmentType;
  /** Secretary only: who the appointment is for. */
  patientId?: number;
};

export type StatusCounts = {
  total: number;
  pending: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  rejected: number;
};

export type AppointmentStats = {
  total: number;
  /** Per-status counts only — the overall total is the sibling field above. */
  byStatus: Record<AppointmentStatus, number>;
  byType: Record<AppointmentType, number>;
  today: number;
  next7Days: number;
  cancellationRate: number;
  noShowRate: number;
  perDoctor: {
    doctorId: number;
    name: string;
    specialty: string;
    total: number;
    completed: number;
    cancelled: number;
  }[];
  daily: { date: string; count: number }[];
};

export const TYPE_LABELS: Record<AppointmentType, string> = {
  consultation: "Consultation",
  "follow-up": "Follow-up",
  checkup: "Checkup",
  emergency: "Emergency",
};

/** Used by the standalone filter bar component. */
export type AppointmentFilter = {
  search: string;
  status: AppointmentStatus | "all";
  doctorId: string;
  specialty: string;
  dateFrom: string;
  dateTo: string;
  sort: "newest" | "oldest";
};
