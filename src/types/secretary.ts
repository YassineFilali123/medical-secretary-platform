export type ConversationStatus = "active" | "waiting" | "closed";

export type Conversation = {
  id: string;
  patientName: string;
  patientId: string;
  status: ConversationStatus;
  priority: "normal" | "high";
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  assignedDoctor?: string;
  messages: { role: "patient" | "ai" | "secretary" | "doctor"; content: string; timestamp: string }[];
};

export type SecretaryAppointment = {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  doctorId: string;
  date: string;
  time: string;
  duration: number;
  status: "scheduled" | "confirmed" | "cancelled" | "completed";
  reason: string;
  notes?: string;
};

export type QueuePatient = {
  id: string;
  patientName: string;
  patientId: string;
  priority: "low" | "medium" | "high";
  estimatedWait: number;
  reason: string;
  arrivedAt: string;
  doctorName?: string;
};

export type EmergencyCase = {
  id: string;
  patientName: string;
  patientId: string;
  severity: "critical" | "high" | "medium";
  condition: string;
  arrivedAt: string;
  status: "waiting" | "assigned" | "resolved";
  assignedDoctor?: string;
  notes?: string;
};

export type AIConversation = {
  id: string;
  patientName: string;
  patientId: string;
  confidence: number;
  escalated: boolean;
  summary: string;
  date: string;
  messageCount: number;
};

export type CallLog = {
  id: string;
  patientName: string;
  patientId: string;
  direction: "inbound" | "outbound";
  duration: number;
  outcome: "answered" | "missed" | "voicemail";
  timestamp: string;
  notes?: string;
};

export type SecretaryNotification = {
  id: string;
  type: "emergency" | "system" | "appointment";
  title: string;
  message: string;
  time: string;
  read: boolean;
  urgent: boolean;
};
