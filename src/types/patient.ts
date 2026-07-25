export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  avatar?: string;
  availableToday: boolean;
  nextSlot: string;
};

export type AppointmentStatus = "upcoming" | "completed" | "cancelled";

export type Appointment = {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  reason: string;
  notes?: string;
};

export type MedicalDocument = {
  id: string;
  type: "report" | "prescription";
  title: string;
  doctorName: string;
  date: string;
  description: string;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "appointment" | "message" | "reminder" | "system";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type HealthTip = {
  id: string;
  title: string;
  description: string;
  icon: string;
};
