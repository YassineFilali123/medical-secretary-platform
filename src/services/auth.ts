import type { User, LoginCredentials, UserRole } from "@/types/auth";

const MOCK_USERS: (User & { password: string })[] = [
  {
    id: "1",
    email: "admin@demo.com",
    name: "Alex Admin",
    role: "admin",
    password: "123456",
  },
  {
    id: "2",
    email: "doctor@demo.com",
    name: "Dr. Sarah Chen",
    role: "doctor",
    password: "123456",
  },
  {
    id: "3",
    email: "secretary@demo.com",
    name: "Marie Dupont",
    role: "secretary",
    password: "123456",
  },
  {
    id: "4",
    email: "patient@demo.com",
    name: "John Doe",
    role: "patient",
    password: "123456",
  },
];

const TOKEN_KEY = "access_token";
const USER_KEY = "auth_user";

function generateFakeToken(userId: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({ sub: userId, iat: Date.now(), exp: Date.now() + 86400000 }),
  );
  return `${header}.${payload}.fake_signature`;
}

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
    await new Promise((r) => setTimeout(r, 400));

    const found = MOCK_USERS.find((u) => u.email === credentials.email);
    if (!found || found.password !== credentials.password) {
      throw new Error("Invalid email or password");
    }

    const user: User = {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
    };
    const token = generateFakeToken(user.id);

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return { user, token, dashboardPath: getDashboardPath(user.role) };
  },

  async register(data: { email: string; password: string; name: string; role: UserRole }) {
    await new Promise((r) => setTimeout(r, 400));

    const exists = MOCK_USERS.some((u) => u.email === data.email);
    if (exists) {
      throw new Error("Email already in use");
    }

    const newUser: User & { password: string } = {
      id: String(Date.now()),
      email: data.email,
      name: data.name,
      role: data.role,
      password: data.password,
    };

    MOCK_USERS.push(newUser);

    const user: User = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    };
    const token = generateFakeToken(user.id);

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return { user, token, dashboardPath: getDashboardPath(user.role) };
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
};
