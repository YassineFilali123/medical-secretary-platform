/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { User, LoginCredentials, UserRole } from "@/types/auth";
import { authService } from "@/services/auth";

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
    const stored = authService.getStoredUser();
    if (stored) {
      setUser(stored);
    }
    setIsInitialized(true);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const result = await authService.login(credentials);
      setUser(result.user);
      navigate(result.dashboardPath, { replace: true });
    },
    [navigate],
  );

  const register = useCallback(
    async (data: { email: string; password: string; name: string; role: UserRole }) => {
      const result = await authService.register(data);
      setUser(result.user);
      navigate(result.dashboardPath, { replace: true });
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
