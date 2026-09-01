/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type {
  User,
  LoginCredentials,
  UserRole,
  VerificationError,
} from "@/types/auth";
import { authService } from "@/services/auth";
import { ROUTES } from "@/constants/routes";
import { API_BASE_URL } from "@/lib/api-config";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: { email: string; password: string; name: string; role: UserRole }) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const stored = authService.getStoredUser();

    if (!stored) {
      setIsInitialized(true);
      return;
    }

    // Show the cached user immediately so the app does not flash the login
    // screen, then reconcile it with the server.
    setUser(stored);

    // The cached role is a snapshot from the last sign-in. If an administrator
    // has since changed this account's role, deactivated it, or deleted it, the
    // snapshot is stale — and the backend, which reads user.roles on every
    // request, would start refusing everything the stale UI offers. Re-reading
    // the profile on load keeps the two in step.
    revalidateSession()
      .then((fresh) => {
        if (cancelled) return;

        if (fresh === null) {
          // Deactivated, deleted, or the token no longer resolves.
          authService.logout();
          setUser(null);
          return;
        }

        setUser(fresh);
        localStorage.setItem("auth_user", JSON.stringify(fresh));
      })
      .catch(() => {
        // Server unreachable: keep the cached user rather than signing someone
        // out over a dropped connection. The backend still refuses anything
        // this role should not reach.
      })
      .finally(() => {
        if (!cancelled) setIsInitialized(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const result = await loginToApi(credentials);
        setUser(result.user);
        navigate(result.dashboardPath, { replace: true });
      } catch (err) {
        if ((err as VerificationError).needsVerification) {
          navigate(ROUTES.VERIFY_EMAIL, { replace: true });
        }
        throw err;
      }
    },
    [navigate],
  );

  const register = useCallback(
    async (data: { email: string; password: string; name: string; role: UserRole }) => {
      const result = await registerOnApi(data);
      if (result.needsVerification) {
        navigate(ROUTES.VERIFY_EMAIL, { replace: true });
      }
    },
    [navigate],
  );

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitialized,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Re-read the signed-in user from the server.
 *
 * Returns the current user, or null when the session is no longer valid —
 * deleted, deactivated, or an unknown token. Throws only on network failure so
 * the caller can tell "signed out" apart from "server unreachable".
 */
async function revalidateSession(): Promise<User | null> {
  const token = localStorage.getItem("access_token");
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}/profile`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!data.success || !data.profile) return null;

  const profile = data.profile;

  // A deactivated account keeps its row, so status has to be checked here too.
  if (profile.status && profile.status !== "active") return null;

  return {
    id: String(profile.id),
    email: profile.email,
    name: profile.name,
    role: (profile.roles?.[0]?.replace("ROLE_", "").toLowerCase() || "patient") as UserRole,
  };
}

async function loginToApi(credentials: LoginCredentials) {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const data = await res.json();

  if (!data.success) {
    if (data.needsVerification) {
      localStorage.setItem("verify_email", data.email);
      const error: VerificationError = new Error(
        data.error || "Please verify your email",
      );
      error.needsVerification = true;
      error.email = data.email;
      throw error;
    }
    throw new Error(data.error || "Login failed");
  }

  const user: User = {
    id: String(data.user.id),
    email: data.user.email,
    name: data.user.name,
    role: (data.user.roles?.[0]?.replace("ROLE_", "").toLowerCase() ||
      "patient") as User["role"],
  };
  const token = `token_${user.id}`;

  localStorage.setItem("access_token", token);
  localStorage.setItem("auth_user", JSON.stringify(user));

  const paths: Record<string, string> = {
    admin: "/admin/dashboard",
    doctor: "/doctor/dashboard",
    secretary: "/secretary/dashboard",
    patient: "/patient/dashboard",
  };
  return { user, token, dashboardPath: paths[user.role] || "/patient/dashboard" };
}

async function registerOnApi(data: { email: string; password: string; name: string; role: string }) {
  const res = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: data.name, email: data.email, password: data.password, role: data.role }),
  });
  const result = await res.json();

  if (!result.success) {
    throw new Error(result.error || "Registration failed");
  }

  localStorage.setItem("verify_email", data.email);
  return { needsVerification: true, email: data.email, debugCode: result.debug_code, message: result.message };
}
