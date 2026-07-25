export type ConversationStatus = "active" | "waiting" | "transferred" | "closed";
export type Priority = "critical" | "high" | "medium" | "low";
export type EmergencyStatus = "pending" | "assigned" | "in_progress" | "resolved";
export type CallStatus = "waiting" | "connected" | "completed" | "missed";

export type MonitoringConversation = {
  id: string;
  patientName: string;
  patientId: string;
  status: ConversationStatus;
  priority: Priority;
  assignedAI: string;
  confidence: number;
  waitingTime: number;
  messageCount: number;
  summary: string;
  startedAt: string;
  lastActivity: string;
  notes: string[];
};

export type MonitoringMessage = {
  id: string;
  conversationId: string;
  sender: "patient" | "ai" | "secretary" | "doctor";
  senderName: string;
  content: string;
  timestamp: string;
};

export type TimelineEntry = {
  id: string;
  conversationId: string;
  type: "message" | "status_change" | "transfer" | "note" | "escalation";
  description: string;
  timestamp: string;
  actor: string;
};

export type CallQueueItem = {
  id: string;
  patientName: string;
  patientId: string;
  reason: string;
  priority: Priority;
  waitingSince: string;
  estimatedWait: number;
  status: CallStatus;
  phone: string;
};

export type EmergencyQueueItem = {
  id: string;
  patientName: string;
  patientId: string;
  reason: string;
  priority: Priority;
  assignedDoctor: string;
  status: EmergencyStatus;
  createdAt: string;
  severity: number;
};

export type DashboardStats = {
  activeConversations: number;
  waitingPatients: number;
  onlineDoctors: number;
  availableSecretaries: number;
  emergencyCases: number;
  avgResponseTime: number;
  todayCalls: number;
  todayAppointments: number;
};

export type MonitoringEvent =
  | { type: "conversation_started"; conversation: MonitoringConversation }
  | { type: "conversation_closed"; conversationId: string }
  | { type: "conversation_updated"; conversation: MonitoringConversation }
  | { type: "call_received"; call: CallQueueItem }
  | { type: "call_removed"; callId: string }
  | { type: "emergency_created"; emergency: EmergencyQueueItem }
  | { type: "emergency_updated"; emergency: EmergencyQueueItem }
  | { type: "stats_updated"; stats: DashboardStats };
