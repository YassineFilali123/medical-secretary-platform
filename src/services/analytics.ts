import type {
  KpiCard,
  DailyAppointmentData,
  MonthlyAppointmentData,
  AppointmentStatusData,
  AiConversationData,
  AiPerformanceData,
  DoctorActivityData,
  PatientGrowthData,
  CallDistributionData,
  SatisfactionData,
  TopDoctor,
  MostActivePatient,
  RecentAppointment,
  RecentAiConversation,
  CallAnalyticsData,
  CallOutcomeData,
  AvgResponseTimeData,
  DoctorPerformanceRow,
  AiConversationHourData,
} from "@/types/analytics";

const MOCK_KPI_CARDS: KpiCard[] = [
  { id: "1", label: "Total Appointments", value: 2468, change: "+12.5%", changeType: "up", icon: "CalendarDays", color: "bg-blue-500" },
  { id: "2", label: "Completed", value: 2104, change: "+8.3%", changeType: "up", icon: "CheckCircle", color: "bg-green-500" },
  { id: "3", label: "Cancelled", value: 186, change: "-3.2%", changeType: "down", icon: "XCircle", color: "bg-red-500" },
  { id: "4", label: "Active Patients", value: 892, change: "+15.1%", changeType: "up", icon: "Users", color: "bg-purple-500" },
  { id: "5", label: "Doctors Online", value: 12, change: "0%", changeType: "neutral", icon: "Stethoscope", color: "bg-teal-500" },
  { id: "6", label: "AI Conversations", value: 3847, change: "+22.4%", changeType: "up", icon: "Bot", color: "bg-indigo-500" },
  { id: "7", label: "Avg Response Time", value: "1.8m", change: "-0.3m", changeType: "down", icon: "Clock", color: "bg-amber-500" },
  { id: "8", label: "Patient Satisfaction", value: "4.6/5", change: "+0.2", changeType: "up", icon: "Smile", color: "bg-emerald-500" },
  { id: "9", label: "Missed Calls", value: 47, change: "-18.5%", changeType: "down", icon: "PhoneMissed", color: "bg-orange-500" },
  { id: "10", label: "Success Rate", value: "91.2%", change: "+2.1%", changeType: "up", icon: "TrendingUp", color: "bg-cyan-500" },
];

const MOCK_DAILY_APPOINTMENTS: DailyAppointmentData[] = [
  { date: "Mon", appointments: 42, completed: 38, cancelled: 3, noShow: 1 },
  { date: "Tue", appointments: 38, completed: 35, cancelled: 2, noShow: 1 },
  { date: "Wed", appointments: 45, completed: 40, cancelled: 4, noShow: 1 },
  { date: "Thu", appointments: 50, completed: 46, cancelled: 3, noShow: 1 },
  { date: "Fri", appointments: 47, completed: 43, cancelled: 2, noShow: 2 },
  { date: "Sat", appointments: 28, completed: 25, cancelled: 2, noShow: 1 },
  { date: "Sun", appointments: 12, completed: 10, cancelled: 1, noShow: 1 },
];

const MOCK_MONTHLY_APPOINTMENTS: MonthlyAppointmentData[] = [
  { month: "Jan", total: 320, completed: 288, cancelled: 32 },
  { month: "Feb", total: 295, completed: 266, cancelled: 29 },
  { month: "Mar", total: 340, completed: 306, cancelled: 34 },
  { month: "Apr", total: 310, completed: 279, cancelled: 31 },
  { month: "May", total: 380, completed: 342, cancelled: 38 },
  { month: "Jun", total: 360, completed: 324, cancelled: 36 },
  { month: "Jul", total: 390, completed: 351, cancelled: 39 },
  { month: "Aug", total: 370, completed: 333, cancelled: 37 },
  { month: "Sep", total: 350, completed: 315, cancelled: 35 },
  { month: "Oct", total: 410, completed: 369, cancelled: 41 },
  { month: "Nov", total: 385, completed: 347, cancelled: 38 },
  { month: "Dec", total: 420, completed: 378, cancelled: 42 },
];

const MOCK_APPOINTMENT_STATUS: AppointmentStatusData[] = [
  { status: "Completed", count: 2104, fill: "#22c55e" },
  { status: "Cancelled", count: 186, fill: "#ef4444" },
  { status: "No Show", count: 98, fill: "#f97316" },
  { status: "Pending", count: 80, fill: "#eab308" },
];

const MOCK_AI_CONVERSATIONS: AiConversationData[] = [
  { date: "Mon", conversations: 120, resolved: 102, escalated: 18 },
  { date: "Tue", conversations: 135, resolved: 118, escalated: 17 },
  { date: "Wed", conversations: 142, resolved: 125, escalated: 17 },
  { date: "Thu", conversations: 158, resolved: 140, escalated: 18 },
  { date: "Fri", conversations: 148, resolved: 130, escalated: 18 },
  { date: "Sat", conversations: 85, resolved: 74, escalated: 11 },
  { date: "Sun", conversations: 62, resolved: 55, escalated: 7 },
];

const MOCK_AI_PERFORMANCE: AiPerformanceData[] = [
  { metric: "Accuracy", value: 94 },
  { metric: "Resolution", value: 87 },
  { metric: "Escalation", value: 12 },
  { metric: "Satisfaction", value: 91 },
  { metric: "Response", value: 96 },
];

const MOCK_DOCTOR_ACTIVITY: DoctorActivityData[] = [
  { name: "Dr. Smith", appointments: 48, completed: 44, avgRating: 4.8 },
  { name: "Dr. Johnson", appointments: 42, completed: 39, avgRating: 4.7 },
  { name: "Dr. Williams", appointments: 38, completed: 35, avgRating: 4.6 },
  { name: "Dr. Brown", appointments: 35, completed: 32, avgRating: 4.5 },
  { name: "Dr. Davis", appointments: 32, completed: 29, avgRating: 4.9 },
  { name: "Dr. Wilson", appointments: 30, completed: 27, avgRating: 4.4 },
  { name: "Dr. Martinez", appointments: 28, completed: 26, avgRating: 4.7 },
  { name: "Dr. Anderson", appointments: 25, completed: 23, avgRating: 4.3 },
];

const MOCK_PATIENT_GROWTH: PatientGrowthData[] = [
  { date: "Jan", newPatients: 45, totalPatients: 620 },
  { date: "Feb", newPatients: 52, totalPatients: 672 },
  { date: "Mar", newPatients: 38, totalPatients: 710 },
  { date: "Apr", newPatients: 61, totalPatients: 771 },
  { date: "May", newPatients: 48, totalPatients: 819 },
  { date: "Jun", newPatients: 55, totalPatients: 874 },
  { date: "Jul", newPatients: 42, totalPatients: 916 },
  { date: "Aug", newPatients: 58, totalPatients: 974 },
  { date: "Sep", newPatients: 35, totalPatients: 1009 },
  { date: "Oct", newPatients: 63, totalPatients: 1072 },
  { date: "Nov", newPatients: 47, totalPatients: 1119 },
  { date: "Dec", newPatients: 51, totalPatients: 1170 },
];

const MOCK_CALL_DISTRIBUTION: CallDistributionData[] = [
  { type: "Appointment Booking", count: 890, fill: "#6366f1" },
  { type: "Follow-up", count: 645, fill: "#22c55e" },
  { type: "Emergency", count: 128, fill: "#ef4444" },
  { type: "General Inquiry", count: 520, fill: "#f59e0b" },
  { type: "Prescription", count: 380, fill: "#8b5cf6" },
];

const MOCK_SATISFACTION: SatisfactionData[] = [
  { month: "Jan", rating: 4.2, responses: 180 },
  { month: "Feb", rating: 4.3, responses: 195 },
  { month: "Mar", rating: 4.1, responses: 210 },
  { month: "Apr", rating: 4.4, responses: 225 },
  { month: "May", rating: 4.5, responses: 240 },
  { month: "Jun", rating: 4.3, responses: 215 },
  { month: "Jul", rating: 4.6, responses: 250 },
  { month: "Aug", rating: 4.5, responses: 235 },
  { month: "Sep", rating: 4.7, responses: 260 },
  { month: "Oct", rating: 4.6, responses: 245 },
  { month: "Nov", rating: 4.8, responses: 270 },
  { month: "Dec", rating: 4.6, responses: 255 },
];

const MOCK_TOP_DOCTORS: TopDoctor[] = [
  { id: "d1", name: "Dr. Sarah Smith", specialty: "Cardiology", appointments: 245, completed: 232, rating: 4.9, satisfaction: 97 },
  { id: "d2", name: "Dr. Michael Johnson", specialty: "Neurology", appointments: 220, completed: 210, rating: 4.8, satisfaction: 95 },
  { id: "d3", name: "Dr. Emily Williams", specialty: "Pediatrics", appointments: 198, completed: 188, rating: 4.8, satisfaction: 96 },
  { id: "d4", name: "Dr. James Brown", specialty: "Orthopedics", appointments: 185, completed: 172, rating: 4.7, satisfaction: 93 },
  { id: "d5", name: "Dr. Lisa Davis", specialty: "Dermatology", appointments: 172, completed: 165, rating: 4.9, satisfaction: 98 },
  { id: "d6", name: "Dr. Robert Wilson", specialty: "General", appointments: 165, completed: 155, rating: 4.6, satisfaction: 92 },
  { id: "d7", name: "Dr. Maria Martinez", specialty: "Psychiatry", appointments: 150, completed: 142, rating: 4.7, satisfaction: 94 },
  { id: "d8", name: "Dr. David Anderson", specialty: "Oncology", appointments: 140, completed: 135, rating: 4.5, satisfaction: 91 },
  { id: "d9", name: "Dr. Jennifer Taylor", specialty: "ENT", appointments: 132, completed: 125, rating: 4.6, satisfaction: 93 },
  { id: "d10", name: "Dr. Christopher Thomas", specialty: "Urology", appointments: 125, completed: 118, rating: 4.4, satisfaction: 90 },
];

const MOCK_MOST_ACTIVE_PATIENTS: MostActivePatient[] = [
  { id: "p1", name: "Alice Johnson", visits: 24, lastVisit: "2025-07-20", conditions: 3 },
  { id: "p2", name: "Bob Williams", visits: 21, lastVisit: "2025-07-22", conditions: 5 },
  { id: "p3", name: "Carol Davis", visits: 19, lastVisit: "2025-07-18", conditions: 2 },
  { id: "p4", name: "David Brown", visits: 17, lastVisit: "2025-07-21", conditions: 4 },
  { id: "p5", name: "Eva Martinez", visits: 15, lastVisit: "2025-07-19", conditions: 2 },
  { id: "p6", name: "Frank Wilson", visits: 14, lastVisit: "2025-07-17", conditions: 3 },
  { id: "p7", name: "Grace Lee", visits: 13, lastVisit: "2025-07-23", conditions: 1 },
  { id: "p8", name: "Henry Taylor", visits: 12, lastVisit: "2025-07-16", conditions: 4 },
  { id: "p9", name: "Irene Anderson", visits: 11, lastVisit: "2025-07-20", conditions: 2 },
  { id: "p10", name: "Jack Thomas", visits: 10, lastVisit: "2025-07-15", conditions: 3 },
];

const MOCK_RECENT_APPOINTMENTS: RecentAppointment[] = [
  { id: "a1", patientName: "Alice Johnson", doctorName: "Dr. Smith", date: "2025-07-25", time: "09:00", status: "completed", type: "consultation" },
  { id: "a2", patientName: "Bob Williams", doctorName: "Dr. Johnson", date: "2025-07-25", time: "09:30", status: "completed", type: "follow-up" },
  { id: "a3", patientName: "Carol Davis", doctorName: "Dr. Williams", date: "2025-07-25", time: "10:00", status: "pending", type: "checkup" },
  { id: "a4", patientName: "David Brown", doctorName: "Dr. Brown", date: "2025-07-25", time: "10:30", status: "confirmed", type: "consultation" },
  { id: "a5", patientName: "Eva Martinez", doctorName: "Dr. Davis", date: "2025-07-25", time: "11:00", status: "cancelled", type: "emergency" },
  { id: "a6", patientName: "Frank Wilson", doctorName: "Dr. Wilson", date: "2025-07-24", time: "14:00", status: "completed", type: "follow-up" },
  { id: "a7", patientName: "Grace Lee", doctorName: "Dr. Martinez", date: "2025-07-24", time: "14:30", status: "completed", type: "consultation" },
  { id: "a8", patientName: "Henry Taylor", doctorName: "Dr. Anderson", date: "2025-07-24", time: "15:00", status: "no-show", type: "checkup" },
  { id: "a9", patientName: "Irene Anderson", doctorName: "Dr. Taylor", date: "2025-07-23", time: "09:00", status: "completed", type: "consultation" },
  { id: "a10", patientName: "Jack Thomas", doctorName: "Dr. Thomas", date: "2025-07-23", time: "11:30", status: "completed", type: "follow-up" },
];

const MOCK_RECENT_AI_CONVERSATIONS: RecentAiConversation[] = [
  { id: "c1", patientName: "Alice Johnson", date: "2025-07-25", summary: "Symptom assessment for headache", messageCount: 12, resolved: true },
  { id: "c2", patientName: "Bob Williams", date: "2025-07-25", summary: "Medication refill request", messageCount: 8, resolved: true },
  { id: "c3", patientName: "Carol Davis", date: "2025-07-25", summary: "Post-surgery follow-up questions", messageCount: 15, resolved: false },
  { id: "c4", patientName: "David Brown", date: "2025-07-24", summary: "Prescription side effects inquiry", messageCount: 10, resolved: true },
  { id: "c5", patientName: "Eva Martinez", date: "2025-07-24", summary: "Appointment scheduling assistance", messageCount: 6, resolved: true },
  { id: "c6", patientName: "Frank Wilson", date: "2025-07-24", summary: "Lab results interpretation", messageCount: 14, resolved: false },
  { id: "c7", patientName: "Grace Lee", date: "2025-07-23", summary: "General health咨询", messageCount: 9, resolved: true },
  { id: "c8", patientName: "Henry Taylor", date: "2025-07-23", summary: "Insurance coverage inquiry", messageCount: 11, resolved: true },
];

const MOCK_CALL_ANALYTICS: CallAnalyticsData[] = [
  { hour: "8AM", inbound: 15, outbound: 8, missed: 2 },
  { hour: "9AM", inbound: 22, outbound: 12, missed: 3 },
  { hour: "10AM", inbound: 28, outbound: 15, missed: 4 },
  { hour: "11AM", inbound: 25, outbound: 14, missed: 3 },
  { hour: "12PM", inbound: 12, outbound: 6, missed: 1 },
  { hour: "1PM", inbound: 20, outbound: 10, missed: 2 },
  { hour: "2PM", inbound: 26, outbound: 13, missed: 3 },
  { hour: "3PM", inbound: 24, outbound: 12, missed: 4 },
  { hour: "4PM", inbound: 18, outbound: 9, missed: 2 },
  { hour: "5PM", inbound: 10, outbound: 5, missed: 1 },
];

const MOCK_CALL_OUTCOMES: CallOutcomeData[] = [
  { outcome: "Answered", count: 1245, fill: "#22c55e" },
  { outcome: "Missed", count: 47, fill: "#ef4444" },
  { outcome: "Voicemail", count: 89, fill: "#f59e0b" },
  { outcome: "Transferred", count: 156, fill: "#6366f1" },
  { outcome: "Abandoned", count: 34, fill: "#94a3b8" },
];

const MOCK_AVG_RESPONSE_TIME: AvgResponseTimeData[] = [
  { date: "Mon", avgMinutes: 2.1 },
  { date: "Tue", avgMinutes: 1.8 },
  { date: "Wed", avgMinutes: 2.3 },
  { date: "Thu", avgMinutes: 1.6 },
  { date: "Fri", avgMinutes: 1.9 },
  { date: "Sat", avgMinutes: 2.5 },
  { date: "Sun", avgMinutes: 3.0 },
];

const MOCK_DOCTOR_PERFORMANCE: DoctorPerformanceRow[] = [
  { id: "d1", name: "Dr. Sarah Smith", specialty: "Cardiology", totalAppointments: 245, completedAppointments: 232, avgDuration: 25, satisfaction: 97, aiAssisted: 68 },
  { id: "d2", name: "Dr. Michael Johnson", specialty: "Neurology", totalAppointments: 220, completedAppointments: 210, avgDuration: 30, satisfaction: 95, aiAssisted: 55 },
  { id: "d3", name: "Dr. Emily Williams", specialty: "Pediatrics", totalAppointments: 198, completedAppointments: 188, avgDuration: 20, satisfaction: 96, aiAssisted: 72 },
  { id: "d4", name: "Dr. James Brown", specialty: "Orthopedics", totalAppointments: 185, completedAppointments: 172, avgDuration: 35, satisfaction: 93, aiAssisted: 42 },
  { id: "d5", name: "Dr. Lisa Davis", specialty: "Dermatology", totalAppointments: 172, completedAppointments: 165, avgDuration: 18, satisfaction: 98, aiAssisted: 80 },
  { id: "d6", name: "Dr. Robert Wilson", specialty: "General", totalAppointments: 165, completedAppointments: 155, avgDuration: 15, satisfaction: 92, aiAssisted: 65 },
  { id: "d7", name: "Dr. Maria Martinez", specialty: "Psychiatry", totalAppointments: 150, completedAppointments: 142, avgDuration: 45, satisfaction: 94, aiAssisted: 38 },
  { id: "d8", name: "Dr. David Anderson", specialty: "Oncology", totalAppointments: 140, completedAppointments: 135, avgDuration: 40, satisfaction: 91, aiAssisted: 50 },
  { id: "d9", name: "Dr. Jennifer Taylor", specialty: "ENT", totalAppointments: 132, completedAppointments: 125, avgDuration: 22, satisfaction: 93, aiAssisted: 60 },
  { id: "d10", name: "Dr. Christopher Thomas", specialty: "Urology", totalAppointments: 125, completedAppointments: 118, avgDuration: 28, satisfaction: 90, aiAssisted: 45 },
];

const MOCK_AI_CONVERSATION_HOURS: AiConversationHourData[] = [
  { hour: "6AM", count: 15 },
  { hour: "7AM", count: 32 },
  { hour: "8AM", count: 58 },
  { hour: "9AM", count: 72 },
  { hour: "10AM", count: 85 },
  { hour: "11AM", count: 78 },
  { hour: "12PM", count: 45 },
  { hour: "1PM", count: 62 },
  { hour: "2PM", count: 80 },
  { hour: "3PM", count: 75 },
  { hour: "4PM", count: 68 },
  { hour: "5PM", count: 52 },
  { hour: "6PM", count: 38 },
  { hour: "7PM", count: 25 },
  { hour: "8PM", count: 18 },
  { hour: "9PM", count: 12 },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0] ?? "";
}

export const analyticsService = {
  getKpiCards: (): KpiCard[] => MOCK_KPI_CARDS,
  getDailyAppointments: (): DailyAppointmentData[] => MOCK_DAILY_APPOINTMENTS,
  getMonthlyAppointments: (): MonthlyAppointmentData[] => MOCK_MONTHLY_APPOINTMENTS,
  getAppointmentStatus: (): AppointmentStatusData[] => MOCK_APPOINTMENT_STATUS,
  getAiConversations: (): AiConversationData[] => MOCK_AI_CONVERSATIONS,
  getAiPerformance: (): AiPerformanceData[] => MOCK_AI_PERFORMANCE,
  getDoctorActivity: (): DoctorActivityData[] => MOCK_DOCTOR_ACTIVITY,
  getPatientGrowth: (): PatientGrowthData[] => MOCK_PATIENT_GROWTH,
  getCallDistribution: (): CallDistributionData[] => MOCK_CALL_DISTRIBUTION,
  getSatisfaction: (): SatisfactionData[] => MOCK_SATISFACTION,
  getTopDoctors: (): TopDoctor[] => MOCK_TOP_DOCTORS,
  getMostActivePatients: (): MostActivePatient[] => MOCK_MOST_ACTIVE_PATIENTS,
  getRecentAppointments: (): RecentAppointment[] => MOCK_RECENT_APPOINTMENTS,
  getRecentAiConversations: (): RecentAiConversation[] => MOCK_RECENT_AI_CONVERSATIONS,
  getCallAnalytics: (): CallAnalyticsData[] => MOCK_CALL_ANALYTICS,
  getCallOutcomes: (): CallOutcomeData[] => MOCK_CALL_OUTCOMES,
  getAvgResponseTime: (): AvgResponseTimeData[] => MOCK_AVG_RESPONSE_TIME,
  getDoctorPerformance: (): DoctorPerformanceRow[] => MOCK_DOCTOR_PERFORMANCE,
  getAiConversationHours: (): AiConversationHourData[] => MOCK_AI_CONVERSATION_HOURS,

  getFilteredDateRange: (startDate: string, endDate: string): DailyAppointmentData[] => {
    return MOCK_DAILY_APPOINTMENTS.filter(() => {
      const d = new Date(daysAgo(Math.floor(Math.random() * 30)));
      const s = new Date(startDate);
      const e = new Date(endDate);
      return d >= s && d <= e;
    });
  },

  getExportData: (type: "excel" | "pdf" | "print"): string => {
    return `${type}-report-${daysAgo(0)}`;
  },
};
