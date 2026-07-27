import { API_BASE_URL, authHeader } from "@/lib/api-config";

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  role: string;
  isVerified: boolean;
  status: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  phone: string | null;
  /**
   * Link to an image on the web. Set by the user, validated server-side:
   * http/https only, max 255 chars (see ProfileController::validateProfileFields).
   */
  avatarUrl: string | null;
  // patient
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  allergies: string | null;
  emergencyContact: string | null;
  // doctor
  /** Chosen from the Admin-managed catalogue. This is what the form writes. */
  specialtyId: number | null;
  /** Display name joined from the catalogue — read-only. */
  specialty: string | null;
  /** False when the Admin has deactivated the doctor's current specialty. */
  specialtyIsActive: boolean | null;
  licenseNumber: string | null;
  bio: string | null;
  clinicName: string | null;
  clinicAddress: string | null;
  // secretary
  department: string | null;
};

/** Only these keys are accepted by the backend whitelist. */
export type ProfileUpdate = Partial<
  Pick<
    UserProfile,
    | "name"
    | "phone"
    | "avatarUrl"
    | "dateOfBirth"
    | "gender"
    | "bloodType"
    | "allergies"
    | "emergencyContact"
    | "specialtyId"
    | "licenseNumber"
    | "bio"
    | "clinicName"
    | "clinicAddress"
    | "department"
  >
>;

export type PasswordChange = {
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

/** Max length of user_profile.avatar_url — mirrored here for client-side UX. */
export const MAX_AVATAR_URL_LENGTH = 255;

/**
 * Only http(s) links become an <img src>. Anything else (javascript:, data:,
 * file:) is refused here as well as server-side.
 */
export function isSafeImageUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
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
    throw new Error((data.error as string) || `Request failed (HTTP ${res.status}).`);
  }

  return data as T;
}

export const profileService = {
  async get(): Promise<UserProfile> {
    const data = await request<{ profile: UserProfile }>("/profile", {
      method: "GET",
      headers: { ...authHeader() },
    });
    return data.profile;
  },

  async update(changes: ProfileUpdate): Promise<UserProfile> {
    const data = await request<{ profile: UserProfile }>("/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(changes),
    });
    return data.profile;
  },

  async changePassword(payload: PasswordChange): Promise<string> {
    const data = await request<{ message: string }>("/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return data.message;
  },
};
