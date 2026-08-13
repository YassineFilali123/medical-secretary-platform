// "week" and "year" are used by the admin statistics dashboard, which offers
// calendar periods rather than rolling windows. The existing analytics pages
// keep their own option list and are unaffected.
export type DateRange = "today" | "7days" | "30days" | "week" | "month" | "year" | "custom";

export type DateFilter = {
  range: DateRange;
  startDate: string;
  endDate: string;
};

export type KpiCard = {
  id: string;
  label: string;
  value: number | string;
  change: string;
  changeType: "up" | "down" | "neutral";
  icon: string;
  color: string;
};

export type DailyAppointmentData = {
  date: string;
  appointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
};

export type MonthlyAppointmentData = {
  month: string;
  total: number;
  completed: number;
  cancelled: number;
};

export type AppointmentStatusData = {
  status: string;
  count: number;
  fill: string;
};

export type AiConversationData = {
  date: string;
  conversations: number;
  resolved: number;
  escalated: number;
};

export type AiPerformanceData = {
  metric: string;
  value: number;
};

export type DoctorActivityData = {
  name: string;
  appointments: number;
  completed: number;
  avgRating: number;
};

export type PatientGrowthData = {
  date: string;
  newPatients: number;
  totalPatients: number;
};

export type CallDistributionData = {
  type: string;
  count: number;
  fill: string;
};

export type SatisfactionData = {
  month: string;
  rating: number;
  responses: number;
};

export type TopDoctor = {
  id: string;
  name: string;
  specialty: string;
  appointments: number;
  completed: number;
  rating: number;
  satisfaction: number;
};

export type MostActivePatient = {
  id: string;
  name: string;
  visits: number;
  lastVisit: string;
  conditions: number;
};

export type RecentAppointment = {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  status: string;
  type: string;
};

export type RecentAiConversation = {
  id: string;
  patientName: string;
  date: string;
  summary: string;
  messageCount: number;
  resolved: boolean;
};

export type SortDirection = "asc" | "desc";

export type SortConfig = {
  key: string;
  direction: SortDirection;
};

export type CallAnalyticsData = {
  hour: string;
  inbound: number;
  outbound: number;
  missed: number;
};

export type CallOutcomeData = {
  outcome: string;
  count: number;
  fill: string;
};

export type AvgResponseTimeData = {
  date: string;
  avgMinutes: number;
};

export type DoctorPerformanceRow = {
  id: string;
  name: string;
  specialty: string;
  totalAppointments: number;
  completedAppointments: number;
  avgDuration: number;
  satisfaction: number;
  aiAssisted: number;
};

export type AiConversationHourData = {
  hour: string;
  count: number;
};
