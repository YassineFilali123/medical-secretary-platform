/** Auth API service – delegates to the mock auth service. */
import { authService as mockAuth } from "@/services/auth";
import type { LoginCredentials, UserRole } from "@/types/auth";

export const authService = {
  login: (credentials: LoginCredentials) => mockAuth.login(credentials),

  register: (data: { email: string; password: string; name: string; role: UserRole }) =>
    mockAuth.register(data),

  logout: () => mockAuth.logout(),

  getStoredUser: () => mockAuth.getStoredUser(),

  getStoredToken: () => mockAuth.getStoredToken(),
};
