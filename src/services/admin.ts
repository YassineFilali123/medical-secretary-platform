import type {
  AdminUser,
  Role,
  AiParameter,
  ConversationScenario,
  FaqItem,
  ActivityLog,
  SystemSetting,
  AdminNotification,
} from "@/types/admin";

const MOCK_USERS: AdminUser[] = [
  { id: "u1", name: "Dr. Sarah Chen", email: "sarah@example.com", role: "doctor", status: "active", createdAt: "2024-01-15", lastLogin: "2025-07-25 08:30" },
  { id: "u2", name: "Dr. Raj Patel", email: "raj@example.com", role: "doctor", status: "active", createdAt: "2024-02-20", lastLogin: "2025-07-24 14:15" },
  { id: "u3", name: "Marie Dupont", email: "marie@example.com", role: "secretary", status: "active", createdAt: "2024-03-10", lastLogin: "2025-07-25 09:00" },
  { id: "u4", name: "Emma Wilson", email: "emma@example.com", role: "patient", status: "active", createdAt: "2024-04-05", lastLogin: "2025-07-25 10:30" },
  { id: "u5", name: "James Rodriguez", email: "james@example.com", role: "patient", status: "active", createdAt: "2024-04-12", lastLogin: "2025-07-25 10:15" },
  { id: "u6", name: "Admin User", email: "admin@example.com", role: "admin", status: "active", createdAt: "2024-01-01", lastLogin: "2025-07-25 11:00" },
  { id: "u7", name: "Dr. Maria Garcia", email: "maria.g@example.com", role: "doctor", status: "active", createdAt: "2024-05-01", lastLogin: "2025-07-23 16:45" },
  { id: "u8", name: "Sophie Martin", email: "sophie@example.com", role: "secretary", status: "inactive", createdAt: "2024-06-15", lastLogin: "2025-06-30 12:00" },
  { id: "u9", name: "John Smith", email: "john@example.com", role: "patient", status: "active", createdAt: "2024-07-01", lastLogin: "2025-07-22 09:30" },
  { id: "u10", name: "Lisa Anderson", email: "lisa@example.com", role: "patient", status: "active", createdAt: "2024-07-10", lastLogin: "2025-07-25 10:40" },
  { id: "u11", name: "Dr. David Kim", email: "david.k@example.com", role: "doctor", status: "inactive", createdAt: "2024-08-20", lastLogin: "2025-06-15 11:00" },
  { id: "u12", name: "Sarah Thompson", email: "sarah.t@example.com", role: "patient", status: "active", createdAt: "2024-09-01", lastLogin: "2025-07-24 15:00" },
];

const MOCK_ROLES: Role[] = [
  { id: "r1", name: "Admin", description: "Full system access with all permissions", userCount: 1, permissions: ["users.*", "roles.*", "settings.*", "ai.*", "analytics.*"] },
  { id: "r2", name: "Doctor", description: "Access to medical features and patient data", userCount: 4, permissions: ["patients.read", "patients.write", "appointments.*", "ai.read", "medical.*"] },
  { id: "r3", name: "Secretary", description: "Front desk and administrative access", userCount: 2, permissions: ["patients.read", "appointments.*", "queue.*", "calls.*", "conversations.*"] },
  { id: "r4", name: "Patient", description: "Personal data and self-service access", userCount: 5, permissions: ["profile.*", "appointments.self", "documents.self", "ai.self"] },
];

const MOCK_PERMISSIONS = [
  { resource: "Users", read: true, write: true, delete: true, admin: true },
  { resource: "Roles", read: true, write: true, delete: true, admin: true },
  { resource: "Patients", read: true, write: true, delete: false, admin: true },
  { resource: "Appointments", read: true, write: true, delete: true, admin: true },
  { resource: "AI Configuration", read: true, write: true, delete: false, admin: true },
  { resource: "Analytics", read: true, write: false, delete: false, admin: true },
  { resource: "Settings", read: true, write: true, delete: false, admin: true },
  { resource: "Calls", read: true, write: false, delete: false, admin: false },
  { resource: "Conversations", read: true, write: true, delete: true, admin: true },
  { resource: "Queue", read: true, write: true, delete: false, admin: false },
];

const MOCK_AI_PARAMETERS: AiParameter[] = [
  { id: "ai1", key: "model_name", label: "AI Model", value: "gpt-4", type: "select", options: ["gpt-4", "gpt-3.5-turbo", "claude-3"], description: "The AI model used for patient conversations" },
  { id: "ai2", key: "temperature", label: "Temperature", value: 0.7, type: "number", description: "Controls response randomness (0-1)" },
  { id: "ai3", key: "max_tokens", label: "Max Tokens", value: 2048, type: "number", description: "Maximum response length" },
  { id: "ai4", key: "confidence_threshold", label: "Confidence Threshold", value: 80, type: "number", description: "Minimum confidence % for AI to handle autonomously" },
  { id: "ai5", key: "auto_escalate", label: "Auto-Escalation", value: true, type: "boolean", description: "Automatically escalate conversations below confidence threshold" },
  { id: "ai6", key: "context_window", label: "Context Window", value: 10, type: "number", description: "Number of previous messages to include as context" },
  { id: "ai7", key: "language", label: "Primary Language", value: "en", type: "select", options: ["en", "fr", "es", "ar"], description: "Primary language for AI responses" },
  { id: "ai8", key: "greeting_enabled", label: "Enable Greeting", value: true, type: "boolean", description: "AI sends automatic greeting to new conversations" },
  { id: "ai9", key: "escalation_delay", label: "Escalation Delay (min)", value: 2, type: "number", description: "Minutes before escalating unanswered AI responses" },
  { id: "ai10", key: "max_conversations", label: "Max Conversations", value: 50, type: "number", description: "Maximum concurrent AI conversations" },
];

const MOCK_ESCALATION_RULES = [
  { id: "er1", condition: "Confidence < 70%", action: "Escalate to human", priority: "high" },
  { id: "er2", condition: "Keywords: chest pain, difficulty breathing", action: "Emergency alert + escalate", priority: "critical" },
  { id: "er3", condition: "Patient requests human 3+ times", action: "Immediate escalation", priority: "high" },
  { id: "er4", condition: "Medication dosage questions", action: "Flag for pharmacist review", priority: "medium" },
  { id: "er5", condition: "Conversation > 20 messages", action: "Suggest human handoff", priority: "low" },
];

const MOCK_DEFAULT_RESPONSES = [
  { id: "dr1", trigger: "greeting", response: "Hello! I'm MedBot, your AI health assistant. How can I help you today?" },
  { id: "dr2", trigger: "emergency_keywords", response: "I understand this sounds urgent. I'm immediately alerting our medical team. Please stay on the line." },
  { id: "dr3", trigger: "appointment_question", response: "Would you like me to check available appointment slots for you?" },
  { id: "dr4", trigger: "medication_question", response: "For medication questions, I can provide general information. For specific dosing advice, please consult your doctor." },
  { id: "dr5", trigger: "fallback", response: "I'm not sure I understand. Let me connect you with a human assistant who can better help you." },
];

const MOCK_SCENARIOS: ConversationScenario[] = [
  { id: "s1", title: "Chest Pain Assessment", description: "Patient reports chest pain - AI triage protocol", category: "emergency", active: true, messages: [
    { role: "patient", content: "I have chest pain" },
    { role: "ai", content: "I understand you're experiencing chest pain. This is serious. Can you describe the pain?" },
    { role: "patient", content: "It's sharp and gets worse when I breathe" },
    { role: "ai", content: "This could be pleuritic chest pain. I'm alerting the medical team immediately. Please stay calm." },
  ]},
  { id: "s2", title: "Prescription Refill", description: "Patient requests medication refill", category: "medication", active: true, messages: [
    { role: "patient", content: "I need a refill for my blood pressure medication" },
    { role: "ai", content: "I can help with that. Which medication do you need refilled?" },
    { role: "patient", content: "Lisinopril 10mg" },
    { role: "ai", content: "I see you have one refill remaining. Would you like me to process this for Dr. Chen's approval?" },
  ]},
  { id: "s3", title: "Appointment Scheduling", description: "Patient wants to book an appointment", category: "appointment", active: true, messages: [
    { role: "patient", content: "I'd like to schedule a checkup" },
    { role: "ai", content: "I'd be happy to help you schedule. Do you have a preferred doctor and date?" },
    { role: "patient", content: "Dr. Chen, next week if possible" },
    { role: "ai", content: "Let me check Dr. Chen's availability for next week." },
  ]},
  { id: "s4", title: "Allergy Symptoms", description: "Patient reports possible allergic reaction", category: "symptom", active: true, messages: [
    { role: "patient", content: "I think I'm having an allergic reaction" },
    { role: "ai", content: "Can you describe your symptoms? Are you having difficulty breathing?" },
    { role: "patient", content: "Rash and swelling, but I can breathe okay" },
    { role: "ai", content: "Good that breathing is normal. I recommend taking an antihistamine and monitoring. I'll flag this for your doctor." },
  ]},
  { id: "s5", title: "General Health Question", description: "Patient asks about symptoms", category: "general", active: false, messages: [
    { role: "patient", content: "I've had a headache for 3 days" },
    { role: "ai", content: "I'm sorry to hear that. Are you experiencing any other symptoms like fever or vision changes?" },
  ]},
];

const MOCK_FAQ_CATEGORIES = ["General", "Appointments", "Medications", "Billing", "Technical", "Emergency", "Insurance"];

const MOCK_FAQS: FaqItem[] = [
  { id: "f1", question: "How do I book an appointment?", answer: "You can book an appointment through the Patient Dashboard or by calling our front desk at +212 5 12 34 56 78.", category: "Appointments", order: 1, active: true },
  { id: "f2", question: "What are your opening hours?", answer: "We are open Monday to Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 2:00 PM.", category: "General", order: 2, active: true },
  { id: "f3", question: "How do I get a prescription refill?", answer: "Prescription refills can be requested through the AI Assistant or by visiting your doctor. Allow 24-48 hours for processing.", category: "Medications", order: 3, active: true },
  { id: "f4", question: "What insurance providers do you accept?", answer: "We accept most major insurance providers including CNSS, CNOPS, and private insurers. Please check with our billing department.", category: "Insurance", order: 4, active: true },
  { id: "f5", question: "How do I cancel an appointment?", answer: "You can cancel appointments from your Patient Dashboard at least 24 hours before the scheduled time to avoid cancellation fees.", category: "Appointments", order: 5, active: true },
  { id: "f6", question: "What should I do in an emergency?", answer: "If you are experiencing a medical emergency, please call 112 immediately or go to the nearest emergency room.", category: "Emergency", order: 6, active: true },
  { id: "f7", question: "How do I update my personal information?", answer: "You can update your personal information from your Profile page in the Patient Dashboard.", category: "General", order: 7, active: true },
  { id: "f8", question: "Do you offer telemedicine consultations?", answer: "Yes, we offer video consultations with our doctors. You can schedule a telemedicine appointment through the portal.", category: "Appointments", order: 8, active: true },
  { id: "f9", question: "How do I access my medical records?", answer: "Your medical records are available in the Documents section of your Patient Dashboard.", category: "Technical", order: 9, active: true },
  { id: "f10", question: "What are your cancellation fees?", answer: "Cancellations within 24 hours of the appointment may incur a fee of 50% of the consultation cost.", category: "Billing", order: 10, active: true },
];

const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  { id: "l1", user: "Dr. Sarah Chen", userId: "u1", action: "login", resource: "session", details: "Successful login from IP 192.168.1.100", ip: "192.168.1.100", timestamp: "2025-07-25 08:30:00" },
  { id: "l2", user: "Marie Dupont", userId: "u3", action: "create", resource: "appointment", details: "Created appointment for Emma Wilson with Dr. Chen", ip: "192.168.1.101", timestamp: "2025-07-25 09:15:00" },
  { id: "l3", user: "Emma Wilson", userId: "u4", action: "login", resource: "session", details: "Successful login from mobile device", ip: "10.0.0.25", timestamp: "2025-07-25 10:30:00" },
  { id: "l4", user: "System", userId: "", action: "escalation", resource: "ai_conversation", details: "AI conversation with Emma Wilson escalated - chest pain keywords detected", ip: "internal", timestamp: "2025-07-25 10:32:00" },
  { id: "l5", user: "Marie Dupont", userId: "u3", action: "update", resource: "user", details: "Updated patient contact information for James Rodriguez", ip: "192.168.1.101", timestamp: "2025-07-25 10:45:00" },
  { id: "l6", user: "Dr. Raj Patel", userId: "u2", action: "view", resource: "patient_record", details: "Accessed medical records for Sarah Thompson", ip: "192.168.1.102", timestamp: "2025-07-25 11:00:00" },
  { id: "l7", user: "Admin User", userId: "u6", action: "update", resource: "settings", details: "Updated AI confidence threshold from 75 to 80", ip: "192.168.1.200", timestamp: "2025-07-25 11:30:00" },
  { id: "l8", user: "System", userId: "", action: "backup", resource: "database", details: "Daily automated backup completed successfully", ip: "internal", timestamp: "2025-07-25 03:00:00" },
  { id: "l9", user: "Dr. Sarah Chen", userId: "u1", action: "complete", resource: "appointment", details: "Completed consultation with James Rodriguez", ip: "192.168.1.100", timestamp: "2025-07-25 11:00:00" },
  { id: "l10", user: "Admin User", userId: "u6", action: "create", resource: "user", details: "Created new secretary account for Sophie Martin", ip: "192.168.1.200", timestamp: "2025-07-24 14:00:00" },
  { id: "l11", user: "Lisa Anderson", userId: "u10", action: "register", resource: "user", details: "New patient registration completed", ip: "10.0.0.50", timestamp: "2025-07-24 16:20:00" },
  { id: "l12", user: "System", userId: "", action: "alert", resource: "ai_monitoring", details: "AI confidence dropped below threshold for 3 conversations", ip: "internal", timestamp: "2025-07-24 10:00:00" },
  { id: "l13", user: "Admin User", userId: "u6", action: "delete", resource: "user", details: "Deactivated inactive user account", ip: "192.168.1.200", timestamp: "2025-07-23 16:00:00" },
  { id: "l14", user: "Dr. Maria Garcia", userId: "u7", action: "update", resource: "availability", details: "Updated weekly availability schedule", ip: "192.168.1.103", timestamp: "2025-07-23 15:30:00" },
  { id: "l15", user: "Marie Dupont", userId: "u3", action: "resolve", resource: "emergency", details: "Resolved emergency case for Robert Taylor", ip: "192.168.1.101", timestamp: "2025-07-23 14:45:00" },
];

const MOCK_SETTINGS: SystemSetting[] = [
  { id: "set1", category: "general", key: "clinic_name", label: "Clinic Name", value: "MedFlow Health Center", type: "text" },
  { id: "set2", category: "general", key: "clinic_address", label: "Clinic Address", value: "123 Healthcare Avenue, Casablanca", type: "text" },
  { id: "set3", category: "general", key: "clinic_phone", label: "Phone Number", value: "+212 5 12 34 56 78", type: "text" },
  { id: "set4", category: "general", key: "clinic_email", label: "Contact Email", value: "contact@medflow.ma", type: "text" },
  { id: "set5", category: "general", key: "timezone", label: "Timezone", value: "Africa/Casablanca", type: "select", options: ["Africa/Casablanca", "UTC", "America/New_York", "Europe/London"] },
  { id: "set6", category: "general", key: "date_format", label: "Date Format", value: "YYYY-MM-DD", type: "select", options: ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"] },
  { id: "set7", category: "security", key: "two_factor", label: "Two-Factor Authentication", value: true, type: "boolean" },
  { id: "set8", category: "security", key: "session_timeout", label: "Session Timeout (minutes)", value: 60, type: "number" },
  { id: "set9", category: "security", key: "password_min_length", label: "Min Password Length", value: 8, type: "number" },
  { id: "set10", category: "security", key: "max_login_attempts", label: "Max Login Attempts", value: 5, type: "number" },
  { id: "set11", category: "email", key: "smtp_host", label: "SMTP Host", value: "smtp.medflow.ma", type: "text" },
  { id: "set12", category: "email", key: "smtp_port", label: "SMTP Port", value: 587, type: "number" },
  { id: "set13", category: "email", key: "smtp_encryption", label: "SMTP Encryption", value: "TLS", type: "select", options: ["TLS", "SSL", "None"] },
  { id: "set14", category: "email", key: "notification_email", label: "Notification Email", value: "noreply@medflow.ma", type: "text" },
  { id: "set15", category: "notifications", key: "email_notifications", label: "Email Notifications", value: true, type: "boolean" },
  { id: "set16", category: "notifications", key: "sms_notifications", label: "SMS Notifications", value: false, type: "boolean" },
  { id: "set17", category: "notifications", key: "appointment_reminders", label: "Appointment Reminders", value: true, type: "boolean" },
  { id: "set18", category: "notifications", key: "emergency_alerts", label: "Emergency Alerts", value: true, type: "boolean" },
  { id: "set19", category: "backup", key: "auto_backup", label: "Automatic Backups", value: true, type: "boolean" },
  { id: "set20", category: "backup", key: "backup_frequency", label: "Backup Frequency", value: "daily", type: "select", options: ["hourly", "daily", "weekly"] },
  { id: "set21", category: "backup", key: "retention_days", label: "Retention Period (days)", value: 30, type: "number" },
];

const MOCK_NOTIFICATIONS: AdminNotification[] = [
  { id: "an1", type: "alert", title: "Emergency Alert", message: "Multiple emergency cases reported - staffing may be needed", time: "10 min ago", read: false },
  { id: "an2", type: "system", title: "System Update", message: "Platform updated to v2.4.1 - new AI features available", time: "1 hour ago", read: false },
  { id: "an3", type: "update", title: "Backup Complete", message: "Daily backup completed successfully. 2.3 GB backed up.", time: "3 hours ago", read: false },
  { id: "an4", type: "alert", title: "AI Performance Drop", message: "AI confidence average dropped to 72% - review may be needed", time: "5 hours ago", read: true },
  { id: "an5", type: "system", title: "New User Registration", message: "3 new patients registered in the last 24 hours", time: "1 day ago", read: true },
  { id: "an6", type: "update", title: "Security Patch", message: "Security patch applied - all systems up to date", time: "2 days ago", read: true },
  { id: "an7", type: "system", title: "Storage Warning", message: "Storage at 78% capacity - consider archiving old records", time: "3 days ago", read: true },
];

export const adminService = {
  getUsers: () => MOCK_USERS,
  getUserById: (id: string) => MOCK_USERS.find((u) => u.id === id),
  getUserCountByRole: (role: string) => MOCK_USERS.filter((u) => u.role === role).length,
  getUserCount: () => MOCK_USERS.length,
  getActiveUserCount: () => MOCK_USERS.filter((u) => u.status === "active").length,
  getRoles: () => MOCK_ROLES,
  getPermissions: () => MOCK_PERMISSIONS,
  getAiParameters: () => MOCK_AI_PARAMETERS,
  getEscalationRules: () => MOCK_ESCALATION_RULES,
  getDefaultResponses: () => MOCK_DEFAULT_RESPONSES,
  getScenarios: () => MOCK_SCENARIOS,
  getFaqs: () => MOCK_FAQS,
  getFaqCategories: () => MOCK_FAQ_CATEGORIES,
  getActivityLogs: () => MOCK_ACTIVITY_LOGS,
  getSettings: () => MOCK_SETTINGS,
  getSettingsByCategory: (category: string) => MOCK_SETTINGS.filter((s) => s.category === category),
  getNotifications: () => MOCK_NOTIFICATIONS,
  markNotificationRead: (id: string) => {
    const n = MOCK_NOTIFICATIONS.find((n) => n.id === id);
    if (n) n.read = true;
  },
  getUnreadNotificationCount: () => MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
};
