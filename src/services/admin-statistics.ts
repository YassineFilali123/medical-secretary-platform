/**
 * Admin statistics dashboard API.
 *
 * Every figure is computed by the backend from the live tables; nothing here
 * derives, estimates, or caches numbers. Admin-only server side.
 */
import { API_BASE_URL, authHeader } from "@/lib/api-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StatsRangeKey = "today" | "week" | "month" | "year" | "custom";

export type StatsKpis = {
  // Scoped to the selected range
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  pendingAppointments: number;
  acceptedAppointments: number;
  rejectedAppointments: number;
  aiConversations: number;
  documentRequests: number;
  documentsPending: number;
  totalRatings: number;
  averageRating: number | null;
  /** Percentage of ratings that were 4 or 5. Null when nobody has rated. */
  patientSatisfaction: number | null;

  // Point-in-time, not range-scoped
  activePatients: number;
  totalDoctors: number;
  totalSecretaries: number;
  totalAdmins: number;
  activeLiveChats: number;
};

export type StatsResponse = {
  range: { key: StatsRangeKey; from: string; to: string };
  kpis: StatsKpis;
  charts: {
    appointmentsOverTime: { date: string; total: number; completed: number; cancelled: number }[];
    appointmentStatus: { status: string; count: number }[];
    aiConversationsOverTime: { date: string; conversations: number }[];
    documentRequestsOverTime: { date: string; requests: number }[];
    ratingDistribution: { stars: number; count: number }[];
  };
};

export type StatsQuery = {
  range: StatsRangeKey;
  startDate?: string;
  endDate?: string;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const adminStatisticsService = {
  async get(query: StatsQuery): Promise<StatsResponse> {
    const params = new URLSearchParams({ range: query.range });
    if (query.range === "custom") {
      if (query.startDate) params.set("startDate", query.startDate);
      if (query.endDate) params.set("endDate", query.endDate);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/admin/statistics?${params.toString()}`, {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
    } catch {
      throw new Error(`Cannot reach the server. Is the backend running on ${API_BASE_URL}?`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Server returned an invalid response (HTTP ${response.status}).`);
    }

    if (!data.success) {
      const err = new Error((data.error as string) || `Request failed (HTTP ${response.status}).`);
      (err as { status?: number }).status = response.status;
      throw err;
    }

    return data as unknown as StatsResponse;
  },
};
