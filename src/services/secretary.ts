import type {
  Conversation,
  SecretaryAppointment,
  QueuePatient,
  EmergencyCase,
  AIConversation,
  CallLog,
  SecretaryNotification,
} from "@/types/secretary";

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv1",
    patientName: "Emma Wilson",
    patientId: "p1",
    status: "active",
    priority: "high",
    lastMessage: "I'm feeling dizzy and my chest hurts",
    lastMessageTime: "2 min ago",
    unread: 3,
    assignedDoctor: "Dr. Chen",
    messages: [
      { role: "patient", content: "Hello? Is anyone there?", timestamp: "10:32 AM" },
      { role: "ai", content: "I'm here to help. How are you feeling today?", timestamp: "10:32 AM" },
      { role: "patient", content: "I'm feeling dizzy and my chest hurts", timestamp: "10:33 AM" },
      { role: "ai", content: "I'm sorry you're experiencing this. I've flagged this as urgent. A secretary will be with you shortly.", timestamp: "10:33 AM" },
      { role: "secretary", content: "Emma, this is Marie. I've seen your message. Can you tell me more about the chest pain?", timestamp: "10:35 AM" },
      { role: "patient", content: "It's a sharp pain when I breathe deeply", timestamp: "10:36 AM" },
    ],
  },
  {
    id: "conv2",
    patientName: "James Rodriguez",
    patientId: "p2",
    status: "active",
    priority: "normal",
    lastMessage: "When should I take the medication?",
    lastMessageTime: "15 min ago",
    unread: 1,
    assignedDoctor: "Dr. Chen",
    messages: [
      { role: "patient", content: "I got my prescription but I'm not sure about the dosage", timestamp: "10:15 AM" },
      { role: "ai", content: "I can help with that. Which medication was prescribed?", timestamp: "10:15 AM" },
      { role: "patient", content: "Amoxicillin 500mg", timestamp: "10:16 AM" },
      { role: "ai", content: "The standard dosage is one capsule three times daily for 7 days. Take with food.", timestamp: "10:17 AM" },
    ],
  },
  {
    id: "conv3",
    patientName: "Sarah Thompson",
    patientId: "p3",
    status: "waiting",
    priority: "normal",
    lastMessage: "I need to reschedule my appointment",
    lastMessageTime: "1 hour ago",
    unread: 0,
    messages: [
      { role: "patient", content: "I need to reschedule my appointment for next week", timestamp: "9:30 AM" },
    ],
  },
  {
    id: "conv4",
    patientName: "Michael Brown",
    patientId: "p4",
    status: "closed",
    priority: "normal",
    lastMessage: "Thank you for your help!",
    lastMessageTime: "Yesterday",
    unread: 0,
    assignedDoctor: "Dr. Patel",
    messages: [
      { role: "patient", content: "I have a question about my lab results", timestamp: "Yesterday 3:00 PM" },
      { role: "ai", content: "I can help you understand your lab results. What specific values are you concerned about?", timestamp: "Yesterday 3:01 PM" },
      { role: "secretary", content: "Michael, Dr. Patel asked me to share your results. Everything looks normal.", timestamp: "Yesterday 3:05 PM" },
      { role: "patient", content: "Thank you for your help!", timestamp: "Yesterday 3:06 PM" },
    ],
  },
  {
    id: "conv5",
    patientName: "Lisa Anderson",
    patientId: "p5",
    status: "active",
    priority: "high",
    lastMessage: "I think I'm having an allergic reaction",
    lastMessageTime: "5 min ago",
    unread: 2,
    messages: [
      { role: "patient", content: "I think I'm having an allergic reaction to the new medication", timestamp: "10:40 AM" },
      { role: "ai", content: "This is urgent. I'm alerting the medical team immediately.", timestamp: "10:40 AM" },
    ],
  },
];

const MOCK_APPOINTMENTS: SecretaryAppointment[] = [
  { id: "sa1", patientName: "Emma Wilson", patientId: "p1", doctorName: "Dr. Chen", doctorId: "d1", date: "2025-07-25", time: "09:00", duration: 30, status: "confirmed", reason: "Chest pain follow-up" },
  { id: "sa2", patientName: "James Rodriguez", patientId: "p2", doctorName: "Dr. Chen", doctorId: "d1", date: "2025-07-25", time: "10:00", duration: 30, status: "confirmed", reason: "Prescription refill" },
  { id: "sa3", patientName: "Sarah Thompson", patientId: "p3", doctorName: "Dr. Patel", doctorId: "d2", date: "2025-07-25", time: "11:00", duration: 45, status: "scheduled", reason: "Annual checkup" },
  { id: "sa4", patientName: "Michael Brown", patientId: "p4", doctorName: "Dr. Patel", doctorId: "d2", date: "2025-07-25", time: "14:00", duration: 30, status: "scheduled", reason: "Lab results discussion" },
  { id: "sa5", patientName: "Lisa Anderson", patientId: "p5", doctorName: "Dr. Chen", doctorId: "d1", date: "2025-07-25", time: "15:00", duration: 30, status: "cancelled", reason: "Allergy consultation" },
  { id: "sa6", patientName: "Robert Taylor", patientId: "p6", doctorName: "Dr. Chen", doctorId: "d1", date: "2025-07-26", time: "09:00", duration: 30, status: "scheduled", reason: "Blood pressure check" },
  { id: "sa7", patientName: "Emily Davis", patientId: "p7", doctorName: "Dr. Patel", doctorId: "d2", date: "2025-07-26", time: "10:00", duration: 60, status: "confirmed", reason: "ECG follow-up" },
  { id: "sa8", patientName: "David Martinez", patientId: "p8", doctorName: "Dr. Chen", doctorId: "d1", date: "2025-07-24", time: "11:00", duration: 30, status: "completed", reason: "General consultation" },
  { id: "sa9", patientName: "Anna Johnson", patientId: "p9", doctorName: "Dr. Patel", doctorId: "d2", date: "2025-07-24", time: "14:00", duration: 30, status: "completed", reason: "Vaccination" },
  { id: "sa10", patientName: "Chris White", patientId: "p10", doctorName: "Dr. Chen", doctorId: "d1", date: "2025-07-27", time: "09:30", duration: 30, status: "scheduled", reason: "Sleep apnea consult" },
];

const MOCK_QUEUE: QueuePatient[] = [
  { id: "q1", patientName: "Emma Wilson", patientId: "p1", priority: "high", estimatedWait: 5, reason: "Chest pain", arrivedAt: "10:30 AM", doctorName: "Dr. Chen" },
  { id: "q2", patientName: "Lisa Anderson", patientId: "p5", priority: "high", estimatedWait: 8, reason: "Allergic reaction", arrivedAt: "10:40 AM" },
  { id: "q3", patientName: "John Smith", patientId: "p11", priority: "medium", estimatedWait: 20, reason: "Fever and cough", arrivedAt: "10:15 AM" },
  { id: "q4", patientName: "Maria Garcia", patientId: "p12", priority: "low", estimatedWait: 35, reason: "Prescription refill", arrivedAt: "9:45 AM" },
  { id: "q5", patientName: "Tom Harris", patientId: "p13", priority: "medium", estimatedWait: 25, reason: "Back pain", arrivedAt: "10:00 AM" },
  { id: "q6", patientName: "Sofia Lee", patientId: "p14", priority: "low", estimatedWait: 40, reason: "Annual checkup", arrivedAt: "9:30 AM" },
];

const MOCK_EMERGENCY_CASES: EmergencyCase[] = [
  { id: "e1", patientName: "Emma Wilson", patientId: "p1", severity: "high", condition: "Chest pain - possible angina", arrivedAt: "10:30 AM", status: "assigned", assignedDoctor: "Dr. Chen" },
  { id: "e2", patientName: "Lisa Anderson", patientId: "p5", severity: "critical", condition: "Severe allergic reaction (anaphylaxis suspected)", arrivedAt: "10:40 AM", status: "assigned", assignedDoctor: "Dr. Patel" },
  { id: "e3", patientName: "Robert Taylor", patientId: "p6", severity: "medium", condition: "High blood pressure (180/110)", arrivedAt: "9:50 AM", status: "resolved", assignedDoctor: "Dr. Chen", notes: "Medication adjusted, monitoring" },
  { id: "e4", patientName: "Unknown Patient", patientId: "", severity: "medium", condition: "Severe headache with vision changes", arrivedAt: "10:20 AM", status: "waiting" },
];

const MOCK_AI_CONVERSATIONS: AIConversation[] = [
  { id: "ai1", patientName: "Emma Wilson", patientId: "p1", confidence: 72, escalated: true, summary: "Patient reported chest pain and dizziness. AI detected urgency and escalated to human.", date: "2025-07-25", messageCount: 6 },
  { id: "ai2", patientName: "James Rodriguez", patientId: "p2", confidence: 88, escalated: false, summary: "Patient asked about Amoxicillin dosage. AI provided standard dosing information.", date: "2025-07-25", messageCount: 4 },
  { id: "ai3", patientName: "Lisa Anderson", patientId: "p5", confidence: 65, escalated: true, summary: "Patient reported allergic reaction symptoms. AI escalated immediately.", date: "2025-07-25", messageCount: 2 },
  { id: "ai4", patientName: "Sarah Thompson", patientId: "p3", confidence: 91, escalated: false, summary: "Patient requested appointment rescheduling.", date: "2025-07-24", messageCount: 1 },
  { id: "ai5", patientName: "Michael Brown", patientId: "p4", confidence: 85, escalated: false, summary: "Patient asked about lab results. AI provided general guidance.", date: "2025-07-24", messageCount: 4 },
  { id: "ai6", patientName: "John Smith", patientId: "p11", confidence: 79, escalated: false, summary: "Patient described fever symptoms. AI suggested home care and monitoring.", date: "2025-07-23", messageCount: 3 },
];

const MOCK_CALL_LOGS: CallLog[] = [
  { id: "cl1", patientName: "Emma Wilson", patientId: "p1", direction: "inbound", duration: 185, outcome: "answered", timestamp: "2025-07-25 10:30", notes: "Patient reported chest pain. Transferred to Dr. Chen." },
  { id: "cl2", patientName: "James Rodriguez", patientId: "p2", direction: "outbound", duration: 92, outcome: "answered", timestamp: "2025-07-25 10:15", notes: "Called to confirm tomorrow's appointment." },
  { id: "cl3", patientName: "Sarah Thompson", patientId: "p3", direction: "inbound", duration: 0, outcome: "missed", timestamp: "2025-07-25 09:45" },
  { id: "cl4", patientName: "Unknown Caller", patientId: "", direction: "inbound", duration: 45, outcome: "voicemail", timestamp: "2025-07-25 09:30" },
  { id: "cl5", patientName: "Michael Brown", patientId: "p4", direction: "outbound", duration: 120, outcome: "answered", timestamp: "2025-07-24 15:00", notes: "Discussed lab results. Patient reassured." },
  { id: "cl6", patientName: "Lisa Anderson", patientId: "p5", direction: "inbound", duration: 210, outcome: "answered", timestamp: "2025-07-24 14:30", notes: "Emergency call - allergic reaction. Dispatched ambulance." },
  { id: "cl7", patientName: "Dr. Chen", patientId: "", direction: "outbound", duration: 65, outcome: "answered", timestamp: "2025-07-24 11:00", notes: "Updated doctor on Emma's case." },
  { id: "cl8", patientName: "Robert Taylor", patientId: "p6", direction: "inbound", duration: 0, outcome: "missed", timestamp: "2025-07-24 09:15" },
];

const MOCK_NOTIFICATIONS: SecretaryNotification[] = [
  { id: "sn1", type: "emergency", title: "Emergency Alert", message: "Lisa Anderson reporting allergic reaction - immediate attention required", time: "5 min ago", read: false, urgent: true },
  { id: "sn2", type: "emergency", title: "High Priority", message: "Emma Wilson - chest pain case needs doctor assignment", time: "8 min ago", read: false, urgent: true },
  { id: "sn3", type: "appointment", title: "Appointment Reminder", message: "Sarah Thompson's annual checkup in 30 minutes", time: "30 min ago", read: false, urgent: false },
  { id: "sn4", type: "system", title: "AI Performance Alert", message: "AI confidence dropped below 70% for 2 conversations today", time: "1 hour ago", read: false, urgent: false },
  { id: "sn5", type: "appointment", title: "Appointment Cancelled", message: "Lisa Anderson cancelled her 3:00 PM appointment", time: "2 hours ago", read: true, urgent: false },
  { id: "sn6", type: "system", title: "Shift Reminder", message: "Your shift starts at 8:00 AM tomorrow", time: "3 hours ago", read: true, urgent: false },
  { id: "sn7", type: "appointment", title: "New Appointment", message: "David Martinez booked a general consultation for July 28", time: "5 hours ago", read: true, urgent: false },
];

export const secretaryService = {
  getConversations: () => MOCK_CONVERSATIONS,
  getActiveConversations: () => MOCK_CONVERSATIONS.filter((c) => c.status === "active"),
  getConversationById: (id: string) => MOCK_CONVERSATIONS.find((c) => c.id === id),
  getConversationMessageCount: () => MOCK_CONVERSATIONS.reduce((s, c) => s + c.messages.length, 0),
  getAppointments: () => MOCK_APPOINTMENTS,
  getAppointmentsByDate: (date: string) => MOCK_APPOINTMENTS.filter((a) => a.date === date),
  getQueue: () => MOCK_QUEUE,
  getHighPriorityQueueCount: () => MOCK_QUEUE.filter((q) => q.priority === "high").length,
  getEmergencyCases: () => MOCK_EMERGENCY_CASES,
  getEmergencyCount: () => MOCK_EMERGENCY_CASES.length,
  getEmergencyCasesByStatus: (status: string) => MOCK_EMERGENCY_CASES.filter((e) => e.status === status),
  getAIConversations: () => MOCK_AI_CONVERSATIONS,
  getAverageConfidence: () => {
    const total = MOCK_AI_CONVERSATIONS.reduce((s, c) => s + c.confidence, 0);
    return Math.round(total / MOCK_AI_CONVERSATIONS.length);
  },
  getEscalatedCount: () => MOCK_AI_CONVERSATIONS.filter((c) => c.escalated).length,
  getCallLogs: () => MOCK_CALL_LOGS,
  getMissedCallCount: () => MOCK_CALL_LOGS.filter((c) => c.outcome === "missed").length,
  getNotifications: () => MOCK_NOTIFICATIONS,
  markNotificationRead: (id: string) => {
    const n = MOCK_NOTIFICATIONS.find((n) => n.id === id);
    if (n) n.read = true;
  },
  getUnreadNotificationCount: () => MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
  resolveEmergency: (id: string) => {
    const e = MOCK_EMERGENCY_CASES.find((e) => e.id === id);
    if (e) e.status = "resolved";
  },
  assignDoctorToEmergency: (id: string, doctorName: string) => {
    const e = MOCK_EMERGENCY_CASES.find((e) => e.id === id);
    if (e) {
      e.assignedDoctor = doctorName;
      e.status = "assigned";
    }
  },
  assignDoctorToAppointment: (id: string, doctorName: string) => {
    const a = MOCK_APPOINTMENTS.find((a) => a.id === id);
    if (a) a.doctorName = doctorName;
  },
  confirmAppointment: (id: string) => {
    const a = MOCK_APPOINTMENTS.find((a) => a.id === id);
    if (a) a.status = "confirmed";
  },
  cancelAppointment: (id: string) => {
    const a = MOCK_APPOINTMENTS.find((a) => a.id === id);
    if (a) a.status = "cancelled";
  },
};
