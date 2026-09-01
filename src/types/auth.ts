export type UserRole = "admin" | "doctor" | "secretary" | "patient";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
};

/**
 * Login rejects with this when the account exists but is unverified, so the
 * caller can route to the verification screen instead of showing an error.
 */
export type VerificationError = Error & {
  needsVerification?: boolean;
  email?: string;
};
