import { API_BASE_URL, authHeader } from "@/lib/api-config";
import type {
  Appointment,
  AppointmentQuery,
  AppointmentStats,
  AppointmentStatus,
  BookingData,
  Doctor,
  Patient,
  StatusCounts,
} from "@/types/appointment";

/**
 * An API failure that carries the server's machine-readable code, so callers can
 * react to a lost slot race (`SLOT_TAKEN`) without matching on message text.
 */
export class AppointmentError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "AppointmentError";
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new AppointmentError(`Cannot reach the server. Is the backend running on ${API_BASE_URL}?`);
  }

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new AppointmentError(`Server returned an invalid response (HTTP ${res.status}).`);
  }

  if (!data.success) {
    throw new AppointmentError(
      (data.error as string) || `Request failed (HTTP ${res.status}).`,
      (data.code as string) ?? null,
    );
  }

  return data as T;
}

function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET", headers: { ...authHeader() } });
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
}

function toQueryString(query: AppointmentQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    // "all" is the UI's way of saying "no status filter"; the server would
    // reject it as an unknown status. Scoped to `status` on purpose — a patient
    // searching for the word "all" must still get a search.
    if (key === "status" && value === "all") continue;
    params.set(key, String(value));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const appointmentService = {
  /** The doctor directory a patient browses before booking. */
  async doctors(specialtyId?: number | "all"): Promise<Doctor[]> {
    const qs = specialtyId && specialtyId !== "all" ? `?specialtyId=${specialtyId}` : "";
    const data = await get<{ doctors: Doctor[] }>(`/doctors${qs}`);
    return data.doctors;
  },

  /** Staff only — used by the secretary to book on a patient's behalf. */
  async patients(search?: string): Promise<Patient[]> {
    const qs = search?.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    const data = await get<{ patients: Patient[] }>(`/patients${qs}`);
    return data.patients;
  },

  /**
   * Appointments visible to the signed-in user. The server decides the scope
   * from their role — a patient gets their own, a doctor gets theirs, staff get
   * everything — so no caller has to remember to filter.
   */
  async list(query: AppointmentQuery = {}): Promise<{ appointments: Appointment[]; total: number }> {
    const data = await get<{ appointments: Appointment[]; total: number }>(
      `/appointments${toQueryString(query)}`,
    );
    return { appointments: data.appointments, total: data.total };
  },

  async byId(id: number): Promise<Appointment> {
    const data = await get<{ appointment: Appointment }>(`/appointments/get?id=${id}`);
    return data.appointment;
  },

  async book(input: BookingData): Promise<Appointment> {
    const data = await post<{ appointment: Appointment }>("/appointments/create", input);
    return data.appointment;
  },

  async cancel(id: number, reason?: string): Promise<Appointment> {
    const data = await post<{ appointment: Appointment }>("/appointments/cancel", { id, reason });
    return data.appointment;
  },

  async reschedule(id: number, date: string, time: string): Promise<Appointment> {
    const data = await post<{ appointment: Appointment }>("/appointments/reschedule", { id, date, time });
    return data.appointment;
  },

  /** Doctor-side lifecycle: accept, reject, or close out an appointment. */
  async setStatus(
    id: number,
    status: "confirmed" | "rejected" | "completed",
    extra: { reason?: string; notes?: string } = {},
  ): Promise<Appointment> {
    const data = await post<{ appointment: Appointment }>("/appointments/status", { id, status, ...extra });
    return data.appointment;
  },

  /** Admin only. */
  async stats(): Promise<AppointmentStats> {
    const data = await get<{ stats: AppointmentStats }>("/appointments/stats");
    return data.stats;
  },

  /** Client-side tallies for the stat cards, over whatever list is on screen. */
  countByStatus(appointments: Appointment[]): StatusCounts {
    const counts: StatusCounts = {
      total: appointments.length,
      pending: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
    };

    for (const appointment of appointments) {
      counts[appointment.status] += 1;
    }

    return counts;
  },
};

/** Does this appointment still lie in the future? */
export function isUpcoming(appointment: Appointment): boolean {
  return new Date(`${appointment.date}T${appointment.time}:00`).getTime() > Date.now();
}

/**
 * Has the visit begun? Mirrors the server's rule for completing an appointment,
 * so the UI does not offer a button guaranteed to be refused.
 */
export function hasStarted(appointment: Appointment): boolean {
  return !isUpcoming(appointment);
}

export function canComplete(appointment: Appointment): boolean {
  return appointment.status === "confirmed" && hasStarted(appointment);
}

export function canCancel(appointment: Appointment, asStaff: boolean): boolean {
  const open: AppointmentStatus[] = ["pending", "confirmed"];
  if (!open.includes(appointment.status)) return false;
  // Staff still need to close out no-shows after the fact; patients do not.
  return asStaff || isUpcoming(appointment);
}

export function canReschedule(appointment: Appointment, asStaff: boolean): boolean {
  return canCancel(appointment, asStaff);
}
