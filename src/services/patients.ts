import { API_BASE_URL, authHeader } from "@/lib/api-config";
import type { AppointmentStatus, AppointmentType } from "@/types/appointment";

/**
 * A patient as the doctor sees them. There is no patient roster in the
 * database — the list is derived from who has booked with this doctor, so it
 * cannot drift, and a doctor can only ever see their own patients.
 */
export type DoctorPatient = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  age: number | null;
  gender: string | null;
  bloodType: string | null;
  allergies: string | null;
  emergencyContact: string | null;
  totalAppointments: number;
  completedVisits: number;
  openAppointments: number;
  /** Date of the most recent completed visit, or null if there has been none. */
  lastVisit: string | null;
  nextAppointment: { date: string; time: string; status: AppointmentStatus } | null;
};

/** One appointment between this doctor and this patient. */
export type PatientAppointment = {
  id: number;
  date: string;
  time: string;
  endTime: string;
  duration: number;
  status: AppointmentStatus;
  type: AppointmentType;
  reason: string;
  /** The doctor's own consultation notes. */
  notes: string | null;
  decisionReason: string | null;
  createdAt: string;
};

export type DoctorPatientRecord = {
  patient: DoctorPatient & { registeredAt: string };
  /** Only appointments with the signed-in doctor. */
  appointments: PatientAppointment[];
  /** Completed visits carrying notes — the consultation history. */
  consultations: PatientAppointment[];
};

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method: "GET", headers: { ...authHeader() } });
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

export const doctorPatientService = {
  async list(search?: string): Promise<DoctorPatient[]> {
    const qs = search?.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    const data = await get<{ patients: DoctorPatient[] }>(`/doctor/patients${qs}`);
    return data.patients;
  },

  async record(patientId: number): Promise<DoctorPatientRecord> {
    return get<DoctorPatientRecord>(`/doctor/patients/get?id=${patientId}`);
  },
};

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
