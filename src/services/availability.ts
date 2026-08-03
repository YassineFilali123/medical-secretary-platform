import { API_BASE_URL, authHeader } from "@/lib/api-config";

/** 0 = Sunday … 6 = Saturday, matching Date.getDay(). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DaySchedule = {
  dayOfWeek: DayOfWeek;
  isEnabled: boolean;
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM" */
  endTime: string;
  slotMinutes: number;
};

export type TimeOff = {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  /** Inclusive day count. */
  days: number;
};

export type Slot = { start: string; end: string };

export type ExistingAppointmentInfo = {
  start: string;
  end: string;
  status: string;
};

export type SlotDay = {
  date: string;
  dayOfWeek: DayOfWeek;
  slots: Slot[];
  /** Why there are no slots, when there are none. */
  reason: "not_working" | "time_off" | "fully_booked" | null;
  workingHours?: { start: string; end: string } | null;
  existingAppointments?: ExistingAppointmentInfo[];
  isFullyBooked?: boolean;
  isTimeOff?: boolean;
  /**
   * Dates only — deliberately NOT the full TimeOff record. This endpoint is
   * readable by any signed-in user, and the doctor's free-text reason is
   * private to them.
   */
  timeOff?: { startDate: string; endDate: string };
};

export type AvailabilityData = {
  schedule: DaySchedule[];
  timeOff: TimeOff[];
};

/** Must match ALLOWED_SLOT_MINUTES in AvailabilityController. */
export const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60, 90] as const;

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

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

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
}

export const availabilityService = {
  async get(): Promise<AvailabilityData> {
    const data = await request<AvailabilityData>("/availability", {
      method: "GET",
      headers: { ...authHeader() },
    });
    return { schedule: data.schedule, timeOff: data.timeOff };
  },

  async saveSchedule(schedule: DaySchedule[]): Promise<AvailabilityData> {
    const data = await post<AvailabilityData>("/availability/update", { schedule });
    return { schedule: data.schedule, timeOff: data.timeOff };
  },

  async addTimeOff(input: {
    startDate: string;
    endDate?: string;
    reason?: string;
  }): Promise<TimeOff[]> {
    const data = await post<{ timeOff: TimeOff[] }>("/availability/timeoff/create", input);
    return data.timeOff;
  },

  async removeTimeOff(id: number): Promise<TimeOff[]> {
    const data = await post<{ timeOff: TimeOff[] }>("/availability/timeoff/delete", { id });
    return data.timeOff;
  },

  /**
   * Bookable slots for a doctor over a date range (defaults to 30 days).
   * Already-booked times are excluded by the server.
   *
   * @param opts.excludeAppointmentId Frees the slot this appointment currently
   *   holds, so the reschedule picker offers the patient their own time back
   *   instead of showing it as taken.
   */
  async slots(
    doctorId: number,
    opts: { from?: string; to?: string; excludeAppointmentId?: number } = {},
  ): Promise<SlotDay[]> {
    const { from, to, excludeAppointmentId } = opts;
    const params = new URLSearchParams({ doctorId: String(doctorId) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (excludeAppointmentId) params.set("excludeAppointmentId", String(excludeAppointmentId));

    const data = await request<{ days: SlotDay[] }>(`/availability/slots?${params}`, {
      method: "GET",
      headers: { ...authHeader() },
    });
    return data.days;
  },
};
