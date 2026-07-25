export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "rejected";

export type AppointmentType = "consultation" | "follow-up" | "emergency" | "checkup";

export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  type: AppointmentType;
  reason: string;
  notes?: string;
  createdAt: string;
};

export type AppointmentFilter = {
  search: string;
  status: AppointmentStatus | "all";
  doctorId: string;
  specialty: string;
  dateFrom: string;
  dateTo: string;
  sort: "newest" | "oldest";
};

export type BookingData = {
  doctorId: string;
  date: string;
  time: string;
  reason: string;
  type: AppointmentType;
};

export type RescheduleData = {
  date: string;
  time: string;
};
