export type ApiResponse<T> = {
  data: T;
  message?: string;
  success: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PaginationParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
};

export type UserRole = "admin" | "doctor" | "secretary" | "patient";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  createdAt?: string;
  lastLogin?: string;
  status?: "active" | "inactive";
};

export type Patient = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address?: string;
  emergencyContact?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  conditions?: string[];
  allergies?: string[];
  lastVisit?: string;
  createdAt: string;
  status: "active" | "inactive";
};

export type Doctor = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  bio?: string;
  clinicName?: string;
  clinicAddress?: string;
  rating?: number;
  availableToday?: boolean;
  nextSlot?: string;
  createdAt: string;
  status: "active" | "inactive";
};

export type Secretary = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  department?: string;
  shift?: string;
  createdAt: string;
  status: "active" | "inactive";
};

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

export type ConversationStatus = "active" | "waiting" | "transferred" | "closed";

export type Priority = "critical" | "high" | "medium" | "low";

export type Conversation = {
  id: string;
  patientId: string;
  patientName: string;
  status: ConversationStatus;
  priority: Priority;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  assignedDoctor?: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
};

export type ConversationMessage = {
  id: string;
  role: "patient" | "ai" | "secretary" | "doctor";
  content: string;
  timestamp: string;
};

export type NotificationType = "appointment" | "message" | "reminder" | "system" | "emergency" | "alert" | "update";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  urgent?: boolean;
  userId?: string;
};

export type Statistics = {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  pendingAppointments: number;
  totalPatients: number;
  activePatients: number;
  totalDoctors: number;
  onlineDoctors: number;
  totalConversations: number;
  activeConversations: number;
  aiResolutionRate: number;
  avgResponseTime: number;
  patientSatisfaction: number;
  todayCalls: number;
  missedCalls: number;
};

export type MedicalDocument = {
  id: string;
  patientId: string;
  type: "report" | "prescription" | "lab-result" | "imaging";
  title: string;
  doctorName: string;
  date: string;
  description: string;
  fileUrl?: string;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
};

export type Permission = {
  id: string;
  resource: string;
  actions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    admin: boolean;
  };
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterData = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
};

export type AuthResponse = {
  user: User;
  token: string;
  refreshToken: string;
  dashboardPath: string;
};
