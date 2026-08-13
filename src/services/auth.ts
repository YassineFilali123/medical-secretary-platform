import type { User, LoginCredentials, UserRole } from "@/types/auth";
import { API_BASE_URL } from "@/lib/api-config";

const API_URL = API_BASE_URL;

const TOKEN_KEY = "access_token";
const USER_KEY = "auth_user";
const VERIFY_EMAIL_KEY = "verify_email";

function getDashboardPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    admin: "/admin/dashboard",
    doctor: "/doctor/dashboard",
    secretary: "/secretary/dashboard",
    patient: "/patient/dashboard",
  };
  return paths[role];
}

export const authService = {
  async login(credentials: LoginCredentials) {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const data = await res.json();

    if (!data.success) {
      if (data.needsVerification) {
        localStorage.setItem(VERIFY_EMAIL_KEY, data.email);
        const error = new Error(data.error || "Please verify your email");
        (error as any).needsVerification = true;
        (error as any).email = data.email;
        throw error;
      }
      throw new Error(data.error || "Login failed");
    }

    const user: User = {
      id: String(data.user.id),
      email: data.user.email,
      name: data.user.name,
      role: (data.user.roles?.[0]?.replace("ROLE_", "").toLowerCase() || "patient") as UserRole,
    };
    const token = `token_${user.id}`;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return { user, token, dashboardPath: getDashboardPath(user.role) };
  },

  async register(data: { email: string; password: string; name: string; role: UserRole }) {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      }),
    });
    const result = await res.json();

    if (!result.success) {
      throw new Error(result.error || "Registration failed");
    }

    localStorage.setItem(VERIFY_EMAIL_KEY, data.email);

    return {
      needsVerification: true,
      email: data.email,
      debugCode: result.debug_code,
      message: result.message,
    };
  },

  async verifyCode(email: string, code: string) {
    const res = await fetch(`${API_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Verification failed");
    }

    localStorage.removeItem(VERIFY_EMAIL_KEY);
    return data;
  },

  async resendCode(email: string) {
    const res = await fetch(`${API_URL}/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to resend code");
    }

    return data;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(VERIFY_EMAIL_KEY);
  },

  getStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getPendingVerificationEmail(): string | null {
    return localStorage.getItem(VERIFY_EMAIL_KEY);
  },
};
