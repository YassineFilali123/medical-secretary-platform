import type { Doctor, Appointment, MedicalDocument, Notification, ChatMessage, HealthTip } from "@/types/patient";

const MOCK_DOCTORS: Doctor[] = [
  { id: "d1", name: "Dr. Sarah Chen", specialty: "Cardiology", rating: 4.8, availableToday: true, nextSlot: "14:30" },
  { id: "d2", name: "Dr. James Wilson", specialty: "Dermatology", rating: 4.6, availableToday: true, nextSlot: "15:00" },
  { id: "d3", name: "Dr. Maria Rodriguez", specialty: "Pediatrics", rating: 4.9, availableToday: false, nextSlot: "09:00" },
  { id: "d4", name: "Dr. Robert Brown", specialty: "Orthopedics", rating: 4.7, availableToday: true, nextSlot: "11:30" },
  { id: "d5", name: "Dr. Emily Davis", specialty: "Neurology", rating: 4.5, availableToday: true, nextSlot: "16:00" },
  { id: "d6", name: "Dr. Michael Lee", specialty: "Ophthalmology", rating: 4.8, availableToday: false, nextSlot: "10:00" },
  { id: "d7", name: "Dr. Lisa Martinez", specialty: "Cardiology", rating: 4.7, availableToday: true, nextSlot: "13:00" },
  { id: "d8", name: "Dr. David Kim", specialty: "Pediatrics", rating: 4.4, availableToday: true, nextSlot: "14:00" },
];

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: "a1", doctorName: "Dr. Sarah Chen", doctorSpecialty: "Cardiology", date: "2026-07-25", time: "14:30", status: "upcoming", reason: "Annual heart checkup" },
  { id: "a2", doctorName: "Dr. James Wilson", doctorSpecialty: "Dermatology", date: "2026-07-28", time: "10:00", status: "upcoming", reason: "Skin rash consultation" },
  { id: "a3", doctorName: "Dr. Robert Brown", doctorSpecialty: "Orthopedics", date: "2026-07-10", time: "11:00", status: "completed", reason: "Knee pain follow-up", notes: "Patient responded well to physical therapy." },
  { id: "a4", doctorName: "Dr. Maria Rodriguez", doctorSpecialty: "Pediatrics", date: "2026-07-05", time: "09:30", status: "completed", reason: "Annual checkup" },
  { id: "a5", doctorName: "Dr. Emily Davis", doctorSpecialty: "Neurology", date: "2026-07-01", time: "15:00", status: "cancelled", reason: "Migraine consultation" },
];

const MOCK_DOCUMENTS: MedicalDocument[] = [
  { id: "doc1", type: "report", title: "Blood Test Results", doctorName: "Dr. Sarah Chen", date: "2026-07-10", description: "Complete blood count and lipid panel results. All values within normal range." },
  { id: "doc2", type: "report", title: "ECG Report", doctorName: "Dr. Sarah Chen", date: "2026-07-10", description: "Electrocardiogram shows normal sinus rhythm. No abnormalities detected." },
  { id: "doc3", type: "prescription", title: "Lisinopril Prescription", doctorName: "Dr. Sarah Chen", date: "2026-07-10", description: "Lisinopril 10mg - Take once daily for blood pressure management." },
  { id: "doc4", type: "prescription", title: "Antibiotic Course", doctorName: "Dr. James Wilson", date: "2026-07-05", description: "Amoxicillin 500mg - Take three times daily for 7 days." },
  { id: "doc5", type: "report", title: "X-Ray Results", doctorName: "Dr. Robert Brown", date: "2026-06-28", description: "Right knee X-ray shows mild joint space narrowing. No fractures detected." },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "Appointment Reminder", message: "You have an appointment with Dr. Sarah Chen tomorrow at 14:30.", time: "2 hours ago", read: false, type: "appointment" },
  { id: "n2", title: "Lab Results Ready", message: "Your blood test results are now available in Documents.", time: "1 day ago", read: false, type: "message" },
  { id: "n3", title: "Prescription Refill", message: "Your Lisinopril prescription is due for refill in 5 days.", time: "2 days ago", read: true, type: "reminder" },
  { id: "n4", title: "Appointment Confirmed", message: "Your appointment with Dr. James Wilson on Jul 28 at 10:00 is confirmed.", time: "3 days ago", read: true, type: "appointment" },
  { id: "n5", title: "Health Tip", message: "Stay hydrated! Drinking 8 glasses of water daily supports heart health.", time: "4 days ago", read: true, type: "system" },
];

const MOCK_CHAT_HISTORY: ChatMessage[] = [
  { id: "m1", role: "assistant", content: "Hello! I'm your AI Medical Assistant. How can I help you today?", timestamp: "10:00" },
  { id: "m2", role: "user", content: "I've been having headaches lately. Should I be concerned?", timestamp: "10:01" },
  { id: "m3", role: "assistant", content: "Headaches can have many causes. Could you tell me more about them? For example, how often do they occur, and where is the pain located?", timestamp: "10:01" },
  { id: "m4", role: "user", content: "About 3-4 times a week, mostly in the front of my head.", timestamp: "10:02" },
  { id: "m5", role: "assistant", content: "I see. Frequent tension-type headaches are common and can often be managed with lifestyle adjustments. However, since you're experiencing them regularly, I recommend discussing this with your doctor. Would you like me to help you schedule an appointment?", timestamp: "10:02" },
];

const MOCK_HEALTH_TIPS: HealthTip[] = [
  { id: "h1", title: "Stay Hydrated", description: "Drink 8 glasses of water daily to maintain optimal health.", icon: "Droplets" },
  { id: "h2", title: "Regular Exercise", description: "30 minutes of moderate activity, 5 times a week.", icon: "Heart" },
  { id: "h3", title: "Sleep Well", description: "Aim for 7-9 hours of quality sleep each night.", icon: "Moon" },
  { id: "h4", title: "Balanced Diet", description: "Include fruits, vegetables, and whole grains in your meals.", icon: "Apple" },
];

const MOCK_RECENT_ACTIVITY = [
  { id: "r1", action: "Appointment completed", detail: "With Dr. Sarah Chen", time: "2 days ago" },
  { id: "r2", action: "Lab results uploaded", detail: "Blood test results available", time: "2 days ago" },
  { id: "r3", action: "Prescription refilled", detail: "Lisinopril 10mg", time: "5 days ago" },
  { id: "r4", action: "Appointment booked", detail: "Dr. James Wilson - Jul 28", time: "1 week ago" },
];

const SPECIALTIES = [...new Set(MOCK_DOCTORS.map((d) => d.specialty))];

export const patientService = {
  getDoctors() { return MOCK_DOCTORS; },
  searchDoctors(query: string) {
    if (!query.trim()) return MOCK_DOCTORS;
    const q = query.toLowerCase();
    return MOCK_DOCTORS.filter((d) => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q));
  },
  getDoctorsBySpecialty(specialty: string) {
    if (specialty === "all") return MOCK_DOCTORS;
    return MOCK_DOCTORS.filter((d) => d.specialty === specialty);
  },
  getSpecialties() { return SPECIALTIES; },
  getDoctorById(id: string) { return MOCK_DOCTORS.find((d) => d.id === id); },
  getAppointments() { return MOCK_APPOINTMENTS; },
  getAppointmentById(id: string) { return MOCK_APPOINTMENTS.find((a) => a.id === id); },
  getUpcomingAppointments() { return MOCK_APPOINTMENTS.filter((a) => a.status === "upcoming"); },
  getCompletedAppointments() { return MOCK_APPOINTMENTS.filter((a) => a.status === "completed"); },
  getCancelledAppointments() { return MOCK_APPOINTMENTS.filter((a) => a.status === "cancelled"); },
  getTodaysAppointments() {
    const today = "2026-07-25";
    return MOCK_APPOINTMENTS.filter((a) => a.date === today);
  },
  bookAppointment(data: { doctorId: string; date: string; time: string; reason: string }) {
    const doctor = MOCK_DOCTORS.find((d) => d.id === data.doctorId);
    if (!doctor) throw new Error("Doctor not found");
    const appt: Appointment = {
      id: `a${Date.now()}`,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      date: data.date,
      time: data.time,
      status: "upcoming",
      reason: data.reason,
    };
    MOCK_APPOINTMENTS.push(appt);
    return appt;
  },
  cancelAppointment(id: string) {
    const appt = MOCK_APPOINTMENTS.find((a) => a.id === id);
    if (appt) appt.status = "cancelled";
    return appt;
  },
  getDocuments() { return MOCK_DOCUMENTS; },
  getNotifications() { return MOCK_NOTIFICATIONS; },
  markNotificationRead(id: string) {
    const n = MOCK_NOTIFICATIONS.find((n) => n.id === id);
    if (n) n.read = true;
    return MOCK_NOTIFICATIONS;
  },
  getChatHistory() { return MOCK_CHAT_HISTORY; },
  addChatMessage(message: ChatMessage) {
    MOCK_CHAT_HISTORY.push(message);
    return MOCK_CHAT_HISTORY;
  },
  getHealthTips() { return MOCK_HEALTH_TIPS; },
  getRecentActivity() { return MOCK_RECENT_ACTIVITY; },
};
