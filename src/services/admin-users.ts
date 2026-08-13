/**
 * Admin user management API.
 *
 * Talks to the real backend (AdminUserController), which re-checks ROLE_ADMIN
 * on every single call. Nothing here is a security boundary — the UI hides what
 * an admin cannot do, but the server is what refuses it.
 */
import { API_BASE_URL, authHeader } from "@/lib/api-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The four roles the platform recognises. */
export const USER_ROLES = ["patient", "doctor", "secretary", "admin"] as const;
export type AdminUserRole = (typeof USER_ROLES)[number];

export type AdminUserStatus = "active" | "inactive";

export type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  role: AdminUserRole;
  roles: string[];
  status: AdminUserStatus;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AdminUserDetail = AdminUserRow & {
  profile: {
    phone: string | null;
    avatarUrl: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    specialtyId: number | null;
    specialty: string | null;
    licenseNumber: string | null;
    bio: string | null;
    clinicName: string | null;
    clinicAddress: string | null;
    department: string | null;
  };
};

export type AdminUserListResult = {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminUserFilters = {
  q?: string;
  role?: string;
  status?: string;
  page?: number;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: AdminUserRole;
  status?: AdminUserStatus;
};

export type UpdateUserInput = {
  id: number;
  name?: string;
  email?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
  /** Optional — omit or leave blank to keep the current password. */
  password?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
        ...(options.headers ?? {}),
      },
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

  return data as unknown as T;
}

function get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return request<T>(`${path}${qs ? `?${qs}` : ""}`, { method: "GET" });
}

function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export type RoleSummary = {
  key: AdminUserRole;
  label: string;
  storedRole: string;
  total: number;
  active: number;
  inactive: number;
};

export const adminUserService = {
  /** Live per-role user counts, derived from user.roles (no separate table). */
  async roleSummary(): Promise<RoleSummary[]> {
    const data = await get<{ roles: RoleSummary[] }>("/admin/roles");
    return data.roles;
  },

  async list(filters: AdminUserFilters = {}): Promise<AdminUserListResult> {
    const params: Record<string, string | number> = {};
    if (filters.q?.trim()) params.q = filters.q.trim();
    if (filters.role && filters.role !== "all") params.role = filters.role;
    if (filters.status && filters.status !== "all") params.status = filters.status;
    params.page = filters.page ?? 1;

    return get<AdminUserListResult>("/admin/users", params);
  },

  async detail(id: number): Promise<AdminUserDetail> {
    const data = await get<{ user: AdminUserDetail }>("/admin/users/get", { id });
    return data.user;
  },

  async create(input: CreateUserInput): Promise<AdminUserRow> {
    const data = await post<{ user: AdminUserRow }>("/admin/users/create", { ...input });
    return data.user;
  },

  async update(input: UpdateUserInput): Promise<AdminUserRow> {
    // An empty password field means "leave it alone", never "set it to blank".
    const body: Record<string, unknown> = { ...input };
    if (!input.password) delete body.password;

    const data = await post<{ user: AdminUserRow }>("/admin/users/update", body);
    return data.user;
  },

  async setStatus(id: number, status: AdminUserStatus): Promise<AdminUserRow> {
    const data = await post<{ user: AdminUserRow }>("/admin/users/status", { id, status });
    return data.user;
  },

  async setRole(id: number, role: AdminUserRole): Promise<AdminUserRow> {
    const data = await post<{ user: AdminUserRow }>("/admin/users/role", { id, role });
    return data.user;
  },

  async remove(id: number): Promise<void> {
    await post("/admin/users/delete", { id });
  },
};
