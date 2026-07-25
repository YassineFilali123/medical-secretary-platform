import type {
  MonitoringConversation,
  MonitoringMessage,
  TimelineEntry,
  CallQueueItem,
  EmergencyQueueItem,
  DashboardStats,
  MonitoringEvent,
  Priority,
  ConversationStatus,
  EmergencyStatus,
} from "@/types/monitoring";

type Listener = (event: MonitoringEvent) => void;

const PATIENT_NAMES = [
  "Emma Wilson", "James Rodriguez", "Sarah Thompson", "Michael Brown",
  "Lisa Anderson", "Robert Taylor", "Emily Davis", "David Martinez",
  "Maria Garcia", "John Smith", "Anna Chen", "Carlos Mendez",
  "Fatima Al-Hassan", "Yuki Tanaka", "Omar Benali", "Sophie Laurent",
];

const DOCTOR_NAMES = [
  "Dr. Sarah Chen", "Dr. James Wilson", "Dr. Maria Rodriguez",
  "Dr. Robert Brown", "Dr. Emily Davis", "Dr. Michael Lee",
];

const AI_NAMES = ["MediAI-Cardio", "MediAI-Derm", "MediAI-Pedia", "MediAI-Ortho", "MediAI-Neuro"];

const CONVERSATION_REASONS = [
  "Chest pain evaluation", "Follow-up blood pressure", "Annual skin check",
  "Fever and cough", "Knee pain consultation", "Migraine evaluation",
  "Vision problems", "Back pain", "Child vaccination", "Rash on arm",
  "Heart palpitations", "Anxiety consultation", "Diabetes management",
  "Post-surgery follow-up", "Allergy testing",
];

const EMERGENCY_REASONS = [
  "Severe chest pain", "Difficulty breathing", "High fever (>40°C)",
  "Suspected fracture", "Severe allergic reaction", "Uncontrolled bleeding",
  "Loss of consciousness", "Severe abdominal pain",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function pickPriority(): Priority {
  const r = Math.random();
  if (r < 0.1) return "critical";
  if (r < 0.3) return "high";
  if (r < 0.7) return "medium";
  return "low";
}

function generateId(): string {
  return `mon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function randomMinutesAgo(min: number, max: number): string {
  const ms = (min + Math.random() * (max - min)) * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

let conversations: MonitoringConversation[] = [];
const messages: MonitoringMessage[] = [];
const timeline: TimelineEntry[] = [];
let callQueue: CallQueueItem[] = [];
let emergencyQueue: EmergencyQueueItem[] = [];
let stats: DashboardStats = {
  activeConversations: 0,
  waitingPatients: 0,
  onlineDoctors: 0,
  availableSecretaries: 0,
  emergencyCases: 0,
  avgResponseTime: 0,
  todayCalls: 0,
  todayAppointments: 0,
};
let listeners: Listener[] = [];
let simulationInterval: ReturnType<typeof setInterval> | null = null;

function emit(event: MonitoringEvent) {
  listeners.forEach((l) => l(event));
}

function generateConversation(): MonitoringConversation {
  const patientName = pick(PATIENT_NAMES);
  const statuses: ConversationStatus[] = ["active", "waiting", "transferred"];
  const status = pick(statuses);
  return {
    id: generateId(),
    patientName,
    patientId: `p_${(patientName.split(" ")[0] ?? "unknown").toLowerCase()}`,
    status,
    priority: pickPriority(),
    assignedAI: pick(AI_NAMES),
    confidence: 60 + Math.floor(Math.random() * 40),
    waitingTime: status === "waiting" ? Math.floor(Math.random() * 300) : 0,
    messageCount: 2 + Math.floor(Math.random() * 15),
    summary: pick(CONVERSATION_REASONS),
    startedAt: randomMinutesAgo(5, 120),
    lastActivity: randomMinutesAgo(0, 10),
    notes: [],
  };
}

function generateCallQueueItem(): CallQueueItem {
  const patientName = pick(PATIENT_NAMES);
  return {
    id: generateId(),
    patientName,
    patientId: `p_${(patientName.split(" ")[0] ?? "unknown").toLowerCase()}`,
    reason: pick(CONVERSATION_REASONS),
    priority: pickPriority(),
    waitingSince: randomMinutesAgo(1, 20),
    estimatedWait: 2 + Math.floor(Math.random() * 15),
    status: "waiting",
    phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
  };
}

function generateEmergency(): EmergencyQueueItem {
  const patientName = pick(PATIENT_NAMES);
  const statuses: EmergencyStatus[] = ["pending", "assigned", "in_progress"];
  return {
    id: generateId(),
    patientName,
    patientId: `p_${(patientName.split(" ")[0] ?? "unknown").toLowerCase()}`,
    reason: pick(EMERGENCY_REASONS),
    priority: pick(["critical", "high"] as Priority[]),
    assignedDoctor: pick(DOCTOR_NAMES),
    status: pick(statuses),
    createdAt: randomMinutesAgo(0, 30),
    severity: 3 + Math.floor(Math.random() * 8),
  };
}

function generateMessages(conversationId: string): MonitoringMessage[] {
  const count = 2 + Math.floor(Math.random() * 6);
  const senders: [string, string] = ["patient", "ai"];
  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    conversationId,
    sender: senders[i % 2] as MonitoringMessage["sender"],
    senderName: i % 2 === 0 ? pick(PATIENT_NAMES) : pick(AI_NAMES),
    content: pick([
      "I've been experiencing discomfort in my chest area.",
      "Based on your symptoms, I recommend scheduling a follow-up.",
      "How long have you been experiencing this?",
      "I've had this pain for about 3 days now.",
      "Let me check your medical history for any related conditions.",
      "Should I be concerned about this?",
      "It's important to get this checked. I'll connect you with a specialist.",
      "Thank you, I'll schedule that right away.",
    ]),
    timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
  }));
}

function generateTimeline(conversationId: string): TimelineEntry[] {
  return [
    { id: generateId(), conversationId, type: "message", description: "Patient initiated conversation", timestamp: randomMinutesAgo(30, 60), actor: "Patient" },
    { id: generateId(), conversationId, type: "status_change", description: "AI started assessment", timestamp: randomMinutesAgo(20, 30), actor: "System" },
    { id: generateId(), conversationId, type: "message", description: "AI collected symptom information", timestamp: randomMinutesAgo(10, 20), actor: "MediAI" },
    { id: generateId(), conversationId, type: "note", description: "Auto-generated summary created", timestamp: randomMinutesAgo(5, 10), actor: "MediAI" },
  ];
}

function recalcStats() {
  stats = {
    activeConversations: conversations.filter((c) => c.status === "active").length,
    waitingPatients: conversations.filter((c) => c.status === "waiting").length + callQueue.filter((c) => c.status === "waiting").length,
    onlineDoctors: 4 + Math.floor(Math.random() * 3),
    availableSecretaries: 2 + Math.floor(Math.random() * 2),
    emergencyCases: emergencyQueue.filter((e) => e.status !== "resolved").length,
    avgResponseTime: 15 + Math.floor(Math.random() * 30),
    todayCalls: 20 + Math.floor(Math.random() * 30),
    todayAppointments: 15 + Math.floor(Math.random() * 20),
  };
}

function initialize() {
  conversations = Array.from({ length: 6 + Math.floor(Math.random() * 5) }, generateConversation);
  callQueue = Array.from({ length: 3 + Math.floor(Math.random() * 4) }, generateCallQueueItem);
  emergencyQueue = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, generateEmergency);
  conversations.forEach((c) => {
    messages.push(...generateMessages(c.id));
    timeline.push(...generateTimeline(c.id));
  });
  recalcStats();
}

function simulateTick() {
  const roll = Math.random();

  if (roll < 0.15 && conversations.length < 15) {
    const conv = generateConversation();
    conv.status = "active";
    conversations = [conv, ...conversations];
    messages.push(...generateMessages(conv.id));
    timeline.push(...generateTimeline(conv.id));
    recalcStats();
    emit({ type: "conversation_started", conversation: conv });
    emit({ type: "stats_updated", stats: { ...stats } });
  } else if (roll < 0.25 && conversations.length > 2) {
    const idx = Math.floor(Math.random() * conversations.length);
    const removed = conversations[idx];
    if (removed) {
      conversations = conversations.filter((_, i) => i !== idx);
      recalcStats();
      emit({ type: "conversation_closed", conversationId: removed.id });
      emit({ type: "stats_updated", stats: { ...stats } });
    }
  } else if (roll < 0.4) {
    const conv = conversations[Math.floor(Math.random() * conversations.length)];
    if (conv) {
      const newStatus = pick(["active", "waiting", "transferred", "closed"] as ConversationStatus[]);
      conv.status = newStatus;
      conv.lastActivity = new Date().toISOString();
      conv.messageCount += 1;
      recalcStats();
      emit({ type: "conversation_updated", conversation: { ...conv } });
      emit({ type: "stats_updated", stats: { ...stats } });
    }
  } else if (roll < 0.55 && callQueue.length < 10) {
    const call = generateCallQueueItem();
    callQueue = [call, ...callQueue];
    recalcStats();
    emit({ type: "call_received", call });
    emit({ type: "stats_updated", stats: { ...stats } });
  } else if (roll < 0.65 && callQueue.length > 0) {
    const idx = Math.floor(Math.random() * callQueue.length);
    const removed = callQueue[idx];
    if (removed) {
      callQueue = callQueue.filter((_, i) => i !== idx);
      recalcStats();
      emit({ type: "call_removed", callId: removed.id });
      emit({ type: "stats_updated", stats: { ...stats } });
    }
  } else if (roll < 0.78 && emergencyQueue.length < 8) {
    const em = generateEmergency();
    emergencyQueue = [em, ...emergencyQueue];
    recalcStats();
    emit({ type: "emergency_created", emergency: em });
    emit({ type: "stats_updated", stats: { ...stats } });
  } else if (roll < 0.88 && emergencyQueue.length > 0) {
    const idx = Math.floor(Math.random() * emergencyQueue.length);
    const em = emergencyQueue[idx];
    if (em) {
      const newStatus: EmergencyStatus = pick(["assigned", "in_progress", "resolved"]);
      em.status = newStatus;
      recalcStats();
      emit({ type: "emergency_updated", emergency: { ...em } });
      emit({ type: "stats_updated", stats: { ...stats } });
    }
  }
}

export const monitoringService = {
  initialize() {
    if (conversations.length === 0) initialize();
  },

  startSimulation(intervalMs = 4000) {
    this.initialize();
    if (simulationInterval) clearInterval(simulationInterval);
    simulationInterval = setInterval(simulateTick, intervalMs);
  },

  stopSimulation() {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  },

  subscribe(listener: Listener): () => void {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  getStats(): DashboardStats {
    this.initialize();
    return { ...stats };
  },

  getConversations(): MonitoringConversation[] {
    this.initialize();
    return [...conversations];
  },

  getConversation(id: string): MonitoringConversation | undefined {
    this.initialize();
    return conversations.find((c) => c.id === id);
  },

  getMessages(conversationId: string): MonitoringMessage[] {
    this.initialize();
    return messages.filter((m) => m.conversationId === conversationId);
  },

  getTimeline(conversationId: string): TimelineEntry[] {
    this.initialize();
    return timeline.filter((t) => t.conversationId === conversationId);
  },

  getCallQueue(): CallQueueItem[] {
    this.initialize();
    return [...callQueue];
  },

  getEmergencyQueue(): EmergencyQueueItem[] {
    this.initialize();
    return [...emergencyQueue];
  },

  takeOverConversation(conversationId: string, secretaryName: string) {
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.status = "active";
      conv.assignedAI = secretaryName;
      conv.lastActivity = new Date().toISOString();
      timeline.push({
        id: generateId(),
        conversationId,
        type: "status_change",
        description: `${secretaryName} took over the conversation`,
        timestamp: new Date().toISOString(),
        actor: secretaryName,
      });
      emit({ type: "conversation_updated", conversation: { ...conv } });
    }
  },

  transferConversation(conversationId: string, doctorName: string) {
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.status = "transferred";
      conv.lastActivity = new Date().toISOString();
      timeline.push({
        id: generateId(),
        conversationId,
        type: "transfer",
        description: `Conversation transferred to ${doctorName}`,
        timestamp: new Date().toISOString(),
        actor: "Secretary",
      });
      emit({ type: "conversation_updated", conversation: { ...conv } });
    }
  },

  closeConversation(conversationId: string) {
    conversations = conversations.filter((c) => c.id !== conversationId);
    recalcStats();
    emit({ type: "conversation_closed", conversationId });
    emit({ type: "stats_updated", stats: { ...stats } });
  },

  addNote(conversationId: string, note: string) {
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.notes.push(note);
      conv.lastActivity = new Date().toISOString();
      timeline.push({
        id: generateId(),
        conversationId,
        type: "note",
        description: note,
        timestamp: new Date().toISOString(),
        actor: "Secretary",
      });
      emit({ type: "conversation_updated", conversation: { ...conv } });
    }
  },

  resolveEmergency(emergencyId: string) {
    const em = emergencyQueue.find((e) => e.id === emergencyId);
    if (em) {
      em.status = "resolved";
      recalcStats();
      emit({ type: "emergency_updated", emergency: { ...em } });
      emit({ type: "stats_updated", stats: { ...stats } });
    }
  },

  removeCall(callId: string) {
    callQueue = callQueue.filter((c) => c.id !== callId);
    recalcStats();
    emit({ type: "call_removed", callId });
    emit({ type: "stats_updated", stats: { ...stats } });
  },
};
