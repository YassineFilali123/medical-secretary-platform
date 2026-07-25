import type {
  DoctorInfo,
  DoctorAppointment,
  DoctorPatient,
  MedicalRecord,
  AiConversation,
  AvailabilitySlot,
  VacationDay,
  DoctorNotification,
  WeeklyStat,
} from "@/types/doctor";

const MOCK_DOCTOR: DoctorInfo = {
  id: "d1",
  name: "Dr. Sarah Chen",
  email: "doctor@demo.com",
  specialty: "Cardiology",
  phone: "+1 (555) 123-4567",
  bio: "Board-certified cardiologist with 12 years of experience in interventional cardiology. Specializing in preventive cardiology and heart disease management.",
  clinicName: "MediFlow Heart Center",
  clinicAddress: "123 Medical Plaza, Suite 400, New York, NY 10001",
};

const MOCK_APPOINTMENTS: DoctorAppointment[] = [
  { id: "a1", patientName: "John Doe", patientId: "p1", date: "2026-07-25", time: "09:00", duration: 30, status: "scheduled", reason: "Chest pain evaluation", type: "consultation" },
  { id: "a2", patientName: "Emma Wilson", patientId: "p2", date: "2026-07-25", time: "10:00", duration: 30, status: "scheduled", reason: "Follow-up blood pressure", type: "follow-up" },
  { id: "a3", patientName: "Robert Brown", patientId: "p3", date: "2026-07-25", time: "11:00", duration: 45, status: "in-progress", reason: "ECG results review", type: "checkup" },
  { id: "a4", patientName: "Lisa Martinez", patientId: "p4", date: "2026-07-25", time: "14:00", duration: 30, status: "scheduled", reason: "Medication adjustment", type: "follow-up" },
  { id: "a5", patientName: "James Taylor", patientId: "p5", date: "2026-07-25", time: "15:00", duration: 60, reason: "Stress test consultation", type: "consultation", status: "scheduled" },
  { id: "a6", patientName: "Sophie Turner", patientId: "p6", date: "2026-07-26", time: "09:30", duration: 30, status: "scheduled", reason: "Heart palpitations", type: "consultation" },
  { id: "a7", patientName: "Michael Scott", patientId: "p7", date: "2026-07-26", time: "11:00", duration: 30, status: "scheduled", reason: "Annual cardiology checkup", type: "checkup" },
  { id: "a8", patientName: "Angela Martin", patientId: "p8", date: "2026-07-24", time: "09:00", duration: 30, status: "completed", reason: "Blood pressure follow-up", type: "follow-up" },
  { id: "a9", patientName: "Dwight Schrute", patientId: "p9", date: "2026-07-24", time: "10:00", duration: 45, status: "completed", reason: "Chest X-ray review", type: "consultation" },
  { id: "a10", patientName: "Pam Beesly", patientId: "p10", date: "2026-07-23", time: "14:00", duration: 30, status: "cancelled", reason: "Routine checkup", type: "checkup" },
];

const MOCK_PATIENTS: DoctorPatient[] = [
  { id: "p1", name: "John Doe", email: "john@email.com", phone: "+1 (555) 111-0001", dateOfBirth: "1985-03-15", gender: "Male", lastVisit: "2026-06-15", condition: "Hypertension", upcomingAppointment: "2026-07-25" },
  { id: "p2", name: "Emma Wilson", email: "emma@email.com", phone: "+1 (555) 111-0002", dateOfBirth: "1992-07-22", gender: "Female", lastVisit: "2026-07-10", condition: "Arrhythmia", upcomingAppointment: "2026-07-25" },
  { id: "p3", name: "Robert Brown", email: "robert@email.com", phone: "+1 (555) 111-0003", dateOfBirth: "1978-11-08", gender: "Male", lastVisit: "2026-07-25", condition: "Coronary Artery Disease" },
  { id: "p4", name: "Lisa Martinez", email: "lisa@email.com", phone: "+1 (555) 111-0004", dateOfBirth: "1990-05-30", gender: "Female", lastVisit: "2026-06-28", condition: "High Cholesterol", upcomingAppointment: "2026-07-25" },
  { id: "p5", name: "James Taylor", email: "james@email.com", phone: "+1 (555) 111-0005", dateOfBirth: "1965-09-12", gender: "Male", lastVisit: "2026-07-01", condition: "Heart Murmur", upcomingAppointment: "2026-07-25" },
  { id: "p6", name: "Sophie Turner", email: "sophie@email.com", phone: "+1 (555) 111-0006", dateOfBirth: "1995-02-18", gender: "Female", lastVisit: "2026-07-05", condition: "Palpitations", upcomingAppointment: "2026-07-26" },
  { id: "p7", name: "Michael Scott", email: "michael@email.com", phone: "+1 (555) 111-0007", dateOfBirth: "1972-04-25", gender: "Male", lastVisit: "2025-12-15", condition: "General Checkup", upcomingAppointment: "2026-07-26" },
  { id: "p8", name: "Angela Martin", email: "angela@email.com", phone: "+1 (555) 111-0008", dateOfBirth: "1980-08-03", gender: "Female", lastVisit: "2026-07-24", condition: "Hypotension" },
];

const MOCK_RECORDS: MedicalRecord[] = [
  { id: "r1", patientId: "p1", date: "2026-06-15", diagnosis: "Stage 1 Hypertension", prescription: "Lisinopril 10mg daily", notes: "Patient responded well to initial treatment. Continue monitoring." },
  { id: "r2", patientId: "p2", date: "2026-07-10", diagnosis: "Sinus Arrhythmia - Benign", prescription: "Beta-blocker as needed", notes: "Holter monitor showed benign sinus arrhythmia. No intervention required." },
  { id: "r3", patientId: "p3", date: "2026-07-25", diagnosis: "Stable Angina", prescription: "Nitroglycerin 0.4mg SL as needed", notes: "ECG shows stable condition. Recommend lifestyle modifications." },
  { id: "r4", patientId: "p4", date: "2026-06-28", diagnosis: "Hyperlipidemia", prescription: "Atorvastatin 20mg daily", notes: "LDL levels elevated. Dietary changes discussed." },
];

const MOCK_CONVERSATIONS: AiConversation[] = [
  { id: "c1", patientId: "p1", patientName: "John Doe", date: "2026-07-24", summary: "Patient inquired about medication side effects. AI provided detailed information about Lisinopril and scheduled a follow-up.", messageCount: 12 },
  { id: "c2", patientId: "p2", patientName: "Emma Wilson", date: "2026-07-23", summary: "Discussed palpitation triggers and lifestyle adjustments. Patient reported reduced anxiety after breathing exercises.", messageCount: 8 },
  { id: "c3", patientId: "p4", patientName: "Lisa Martinez", date: "2026-07-22", summary: "Questions about cholesterol management diet. AI provided meal plan recommendations and exercise guidelines.", messageCount: 15 },
  { id: "c4", patientId: "p6", patientName: "Sophie Turner", date: "2026-07-21", summary: "Patient reported occasional chest discomfort. AI triaged and recommended scheduling an appointment.", messageCount: 6 },
];

const MOCK_AVAILABILITY: AvailabilitySlot[] = [
  { dayOfWeek: 1, enabled: true, startTime: "09:00", endTime: "17:00", slotDuration: 30 },
  { dayOfWeek: 2, enabled: true, startTime: "09:00", endTime: "17:00", slotDuration: 30 },
  { dayOfWeek: 3, enabled: true, startTime: "09:00", endTime: "17:00", slotDuration: 30 },
  { dayOfWeek: 4, enabled: true, startTime: "09:00", endTime: "17:00", slotDuration: 30 },
  { dayOfWeek: 5, enabled: true, startTime: "09:00", endTime: "15:00", slotDuration: 30 },
  { dayOfWeek: 6, enabled: false, startTime: "09:00", endTime: "12:00", slotDuration: 30 },
  { dayOfWeek: 0, enabled: false, startTime: "09:00", endTime: "12:00", slotDuration: 30 },
];

const MOCK_VACATIONS: VacationDay[] = [
  { id: "v1", date: "2026-08-15", reason: "Summer vacation" },
  { id: "v2", date: "2026-08-16", reason: "Summer vacation" },
  { id: "v3", date: "2026-08-17", reason: "Summer vacation" },
];

const MOCK_NOTIFICATIONS: DoctorNotification[] = [
  { id: "n1", type: "emergency", title: "Emergency Alert", message: "Patient John Doe reporting severe chest pain. Immediate attention required.", time: "2 min ago", read: false, urgent: true },
  { id: "n2", type: "appointment", title: "Appointment Reminder", message: "You have 5 appointments scheduled for tomorrow.", time: "1 hour ago", read: false, urgent: false },
  { id: "n3", type: "system", title: "Lab Results Available", message: "ECG results for Robert Brown are ready for review.", time: "3 hours ago", read: true, urgent: false },
  { id: "n4", type: "appointment", title: "Schedule Change", message: "Patient Lisa Martinez rescheduled from 14:00 to 15:30.", time: "5 hours ago", read: true, urgent: false },
  { id: "n5", type: "system", title: "New AI Summary", message: "AI conversation summary for Sophie Turner is ready.", time: "1 day ago", read: true, urgent: false },
];

const MOCK_WEEKLY_STATS: WeeklyStat[] = [
  { day: "Mon", appointments: 8, completed: 7 },
  { day: "Tue", appointments: 10, completed: 9 },
  { day: "Wed", appointments: 7, completed: 6 },
  { day: "Thu", appointments: 9, completed: 8 },
  { day: "Fri", appointments: 5, completed: 5 },
  { day: "Sat", appointments: 2, completed: 2 },
  { day: "Sun", appointments: 0, completed: 0 },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const doctorService = {
  getProfile() {
    return MOCK_DOCTOR;
  },

  getTodaysAppointments() {
    const today = "2026-07-25";
    return MOCK_APPOINTMENTS.filter((a) => a.date === today);
  },

  getUpcomingAppointments() {
    const today = "2026-07-25";
    return MOCK_APPOINTMENTS.filter((a) => a.date >= today && a.status !== "cancelled").sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  },

  getAllAppointments() {
    return MOCK_APPOINTMENTS;
  },

  getAppointmentById(id: string) {
    return MOCK_APPOINTMENTS.find((a) => a.id === id);
  },

  getAppointmentsByDate(date: string) {
    return MOCK_APPOINTMENTS.filter((a) => a.date === date);
  },

  getPatients() {
    return MOCK_PATIENTS;
  },

  getPatientById(id: string) {
    return MOCK_PATIENTS.find((p) => p.id === id);
  },

  getPatientRecords(patientId: string) {
    return MOCK_RECORDS.filter((r) => r.patientId === patientId);
  },

  getPatientAppointments(patientId: string) {
    return MOCK_APPOINTMENTS.filter((a) => a.patientId === patientId);
  },

  getConversations() {
    return MOCK_CONVERSATIONS;
  },

  getConversationById(id: string) {
    return MOCK_CONVERSATIONS.find((c) => c.id === id);
  },

  getAvailability() {
    return MOCK_AVAILABILITY;
  },

  updateAvailability(slots: AvailabilitySlot[]) {
    slots.forEach((s) => {
      const idx = MOCK_AVAILABILITY.findIndex((a) => a.dayOfWeek === s.dayOfWeek);
      if (idx >= 0) MOCK_AVAILABILITY[idx] = s;
    });
    return MOCK_AVAILABILITY;
  },

  getVacations() {
    return MOCK_VACATIONS;
  },

  addVacation(vacation: VacationDay) {
    MOCK_VACATIONS.push(vacation);
    return MOCK_VACATIONS;
  },

  removeVacation(id: string) {
    const idx = MOCK_VACATIONS.findIndex((v) => v.id === id);
    if (idx >= 0) MOCK_VACATIONS.splice(idx, 1);
    return MOCK_VACATIONS;
  },

  getNotifications() {
    return MOCK_NOTIFICATIONS;
  },

  markNotificationRead(id: string) {
    const n = MOCK_NOTIFICATIONS.find((n) => n.id === id);
    if (n) n.read = true;
    return MOCK_NOTIFICATIONS;
  },

  getWeeklyStats() {
    return MOCK_WEEKLY_STATS;
  },

  getDayName(dayIndex: number) {
    return DAY_NAMES[dayIndex] ?? "";
  },

  updateProfile(data: Partial<DoctorInfo>) {
    Object.assign(MOCK_DOCTOR, data);
    return MOCK_DOCTOR;
  },
};
