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
