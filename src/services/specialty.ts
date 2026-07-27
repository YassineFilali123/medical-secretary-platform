import { API_BASE_URL, authHeader } from "@/lib/api-config";

export type Specialty = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  /** Only returned to admins — how many doctors currently use this specialty. */
  doctorCount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export const MAX_SPECIALTY_NAME_LENGTH = 120;
export const MAX_SPECIALTY_DESCRIPTION_LENGTH = 255;

/** Thrown when a delete is refused because doctors still use the specialty. */
export class SpecialtyInUseError extends Error {
  readonly doctorCount: number;

  constructor(message: string, doctorCount: number) {
    super(message);
    this.name = "SpecialtyInUseError";
    this.doctorCount = doctorCount;
  }
}

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
    const message = (data.error as string) || `Request failed (HTTP ${res.status}).`;
    if (data.code === "SPECIALTY_IN_USE") {
      throw new SpecialtyInUseError(message, Number(data.doctorCount ?? 0));
    }
    throw new Error(message);
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

export const specialtyService = {
  /** Admins receive every specialty; everyone else receives only active ones. */
  async list(): Promise<Specialty[]> {
    const data = await request<{ specialties: Specialty[] }>("/specialties", {
      method: "GET",
      headers: { ...authHeader() },
    });
    return data.specialties;
  },

  async create(input: { name: string; description?: string; sortOrder?: number }): Promise<Specialty> {
    const data = await post<{ specialty: Specialty }>("/specialties/create", input);
    return data.specialty;
  },

  async update(input: {
    id: number;
    name?: string;
    description?: string;
    sortOrder?: number;
  }): Promise<Specialty> {
    const data = await post<{ specialty: Specialty }>("/specialties/update", input);
    return data.specialty;
  },

  /** Throws SpecialtyInUseError when doctors still reference it. */
  async remove(id: number): Promise<string> {
    const data = await post<{ message: string }>("/specialties/delete", { id });
    return data.message;
  },

  async setActive(id: number, isActive: boolean): Promise<Specialty> {
    const data = await post<{ specialty: Specialty }>("/specialties/toggle", { id, isActive });
    return data.specialty;
  },
};
