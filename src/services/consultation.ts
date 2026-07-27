import { API_BASE_URL, authHeader } from "@/lib/api-config";
import type { AppointmentStatus, AppointmentType } from "@/types/appointment";

export type ReasonCategory =
  | "patient_explanation"
  | "emergency"
  | "additional_examination"
  | "other";

export const REASON_LABELS: Record<ReasonCategory, string> = {
  patient_explanation: "Patient needs more explanation",
  emergency: "Emergency case",
  additional_examination: "Additional examination",
  other: "Other",
};

/** Quick picks in the UI. Any 1–240 is accepted as a custom value. */
export const PRESET_MINUTES = [5, 10, 15] as const;
export const MIN_EXTENSION = 1;
export const MAX_EXTENSION = 240;

export type Consultation = {
  appointmentId: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Set once the consultation has been extended at least once. */
  originalEndTime: string | null;
  duration: number;
  extendedMinutes: number;
  delayedMinutes: number;
  status: AppointmentStatus;
  type: AppointmentType;
  reason: string;
  notes: string | null;
  /** Local-time ISO instants, for elapsed/remaining maths. */
  scheduledStart: string;
  scheduledEnd: string;
  startedAt: string | null;
  endedAt: string | null;
};

export type PendingRequest = {
  id: number;
  minutes: number;
  reason: string | null;
  reasonCategory: ReasonCategory;
  isEmergency: boolean;
  createdAt: string;
};

export type ActiveConsultation = {
  consultation: Consultation | null;
  upNext: Consultation[];
  pendingRequest?: PendingRequest | null;
  /** The server's clock, so elapsed time does not depend on the browser's. */
  serverTime: string;
};

export type AffectedAppointment = {
  id: number;
  patientId: number;
  patientName: string;
  date: string;
  fromStart: string;
  fromEnd: string;
  toStart: string;
  toEnd: string;
  delay: number;
  status: AppointmentStatus;
};

export type ExtensionOutcome = {
  outcome: "approved" | "needs_approval";
  requestId: number;
  message: string;
  basis: "no_next" | "free_gap" | "conflict";
  affected: AffectedAppointment[];
  consultation?: Consultation;
};

export type AdjustmentRequest = {
  id: number;
  appointmentId: number;
  doctorId: number;
  doctorName: string;
  patientId: number;
  patientName: string;
  requestedMinutes: number;
  grantedMinutes: number | null;
  reason: string | null;
  reasonCategory: ReasonCategory;
  isEmergency: boolean;
  status: "auto_approved" | "pending" | "approved" | "rejected" | "cancelled";
  decisionBasis: "no_next" | "free_gap" | "conflict";
  affectedCount: number;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  appointment: { date: string; start: string; end: string; status: AppointmentStatus };
};

export type DelayHistoryEntry = {
  id: number;
  requestId: number | null;
  changeType: "extension" | "cascade";
  from: { date: string; start: string; end: string };
  to: { date: string; start: string; end: string };
  delayMinutes: number;
  changedBy: string;
  reason: string | null;
  reasonCategory: ReasonCategory | null;
  isEmergency: boolean;
  createdAt: string;
};

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  relatedType: string | null;
  relatedId: number | null;
  isUrgent: boolean;
  isRead: boolean;
  createdAt: string;
};

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error(`Cannot reach the server. Is the backend running on ${API_BASE_URL}?`);
  }

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned an invalid response (HTTP ${res.status}).`);
  }

  if (!data.success) {
    throw new Error((data.error as string) || `Request failed (HTTP ${res.status}).`);
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

export const consultationService = {
  active: () => get<ActiveConsultation>("/consultations/active"),

  start: (appointmentId: number) =>
    post<{ consultation: Consultation }>("/consultations/start", { appointmentId }),

  end: (appointmentId: number, notes?: string) =>
    post<{ consultation: Consultation; cancelledRequests: number }>("/consultations/end", {
      appointmentId,
      notes,
    }),

  extend: (input: {
    appointmentId: number;
    minutes: number;
    reasonCategory: ReasonCategory;
    reason?: string;
    isEmergency?: boolean;
  }) => post<ExtensionOutcome>("/consultations/extend", input),
};

export const adjustmentService = {
  list: (status?: string) =>
    get<{ requests: AdjustmentRequest[]; pendingCount: number }>(
      `/adjustments${status && status !== "all" ? `?status=${status}` : ""}`,
    ),

  decide: (input: { id: number; decision: "approve" | "reject"; minutes?: number; note?: string }) =>
    post<{ message: string; granted?: number; shifted?: number }>("/adjustments/decide", input),

  history: (appointmentId: number) =>
    get<{ history: DelayHistoryEntry[] }>(`/adjustments/history?appointmentId=${appointmentId}`),
};

export const notificationService = {
  /**
   * @param since Highest id already held. The server returns only newer rows,
   *   which is what makes polling cheap enough to run continuously.
   */
  list: (since?: number) =>
    get<{ notifications: AppNotification[]; unreadCount: number; latestId: number }>(
      `/notifications${since ? `?since=${since}` : ""}`,
    ),

  markRead: (id: number) => post<{ updated: number }>("/notifications/read", { id }),

  markAllRead: () => post<{ updated: number }>("/notifications/read", { all: true }),
};

/** Whole seconds between two instants, never negative. */
export function secondsBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));
}

/** 3725 -> "1:02:05", 125 -> "2:05". */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}
