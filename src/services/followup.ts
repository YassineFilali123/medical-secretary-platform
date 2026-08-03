import { API_BASE_URL, authHeader } from "@/lib/api-config";

// ── Types ────────────────────────────────────────────────────

export type FollowUpType = "none" | "period";
export type FollowUpPriority = "routine" | "recommended" | "urgent";
export type FollowUpStatus = "pending" | "accepted" | "booked" | "cancelled" | "expired";

export type ExistingAppointment = {
  start: string;
  end: string;
  status: string;
};

export type CalendarDayStatus = "green" | "red";

export type CalendarDay = {
  date: string;
  dayOfWeek: number;
  status: CalendarDayStatus;
  isTimeOff: boolean;
  workingHours: { start: string; end: string } | null;
  availableSlots: { start: string; end: string }[];
  existingAppointments: ExistingAppointment[];
  appointmentCount: number;
  isFullyBooked: boolean;
};

export type FollowUpRecommendation = {
  id: number;
  appointmentId: number;
  doctorId: number;
  patientId: number;
  doctorName: string | null;
  doctorAvatar: string | null;
  patientName: string | null;
  patientAvatar: string | null;
  type: FollowUpType;
  priority: FollowUpPriority;
  periodDays: number | null;
  periodLabel: string | null;
  note: string | null;
  status: FollowUpStatus;
  bookedAppointmentId: number | null;
  createdAt: string;
  expiresAt: string | null;
};

export const PERIOD_PRESETS = [
  { days: 3, label: "Within 3 days" },
  { days: 7, label: "Within 1 week" },
  { days: 14, label: "Within 2 weeks" },
  { days: 30, label: "Within 1 month" },
] as const;

// ── Helpers ──────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error("Cannot reach the server.");
  }
  const data = await res.json();
  if (!data.success) {
    const err = new Error(data.error || "Request failed.") as Error & { code?: string };
    if (data.code) err.code = data.code;
    throw err;
  }
  return data as T;
}

const get = <T>(path: string) => request<T>(path, { method: "GET", headers: { ...authHeader() } });

const post = <T>(path: string, body: unknown) =>
  request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });

// ── Follow-Up Service ────────────────────────────────────────

export const followUpService = {
  /** Doctor creates a follow-up recommendation after ending a consultation. */
  create: (input: {
    appointmentId: number;
    type: FollowUpType;
    priority?: FollowUpPriority;
    periodDays?: number;
    periodLabel?: string;
    note?: string;
  }) => post<{ message: string }>("/followups/create", input),

  /** Doctor's follow-up recommendations. */
  doctorList: () => get<{ followUps: FollowUpRecommendation[] }>("/followups/doctor"),

  /** Patient's follow-up recommendations. */
  patientList: () => get<{ followUps: FollowUpRecommendation[] }>("/followups/patient"),

  /** Secretary's view of all pending follow-up recommendations. */
  secretaryList: () => get<{ followUps: FollowUpRecommendation[] }>("/followups/secretary"),

  /** Calendar data for a specific follow-up (color-coded days). */
  calendar: (followUpId: number) =>
    get<{ followUp: FollowUpRecommendation; days: CalendarDay[] }>(
      `/followups/calendar?id=${followUpId}`,
    ),

  /** Patient books a slot within a period recommendation. */
  book: (followUpId: number, date: string, time: string) =>
    post<{ message: string; appointmentId: number }>("/followups/book", {
      followUpId,
      date,
      time,
    }),

  /** Secretary books an appointment for a patient. */
  secretaryBook: (
    followUpId: number,
    date: string,
    time: string,
    overrideWarning?: boolean,
  ) =>
    post<{ message: string; appointmentId: number }>("/followups/secretary/book", {
      followUpId,
      date,
      time,
      overrideWarning,
    }),

  /** Check and send reminders (called by polling). */
  checkReminders: () => post<{ remindersSent: number }>("/followups/reminders", {}),
};
