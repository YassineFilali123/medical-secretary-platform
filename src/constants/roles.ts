import type { UserRole } from "@/types/auth";

/**
 * The four roles the platform recognises.
 *
 * This is descriptive metadata for the UI — labels, colours, where each role
 * lands after login. It is NOT a permission system and nothing here grants
 * access. A role is the value stored in `user.roles`, and every decision that
 * matters is made by the backend, which re-reads that column on each request.
 *
 * `capabilities` documents what each role can actually reach today, so the
 * admin screen describes real behaviour instead of inventing a matrix.
 */
export type RoleDefinition = {
  key: UserRole;
  label: string;
  /** The value stored in user.roles. */
  storedRole: string;
  description: string;
  /** Where this role lands after signing in. */
  dashboardPath: string;
  /** Route prefix guarded for this role in App.tsx. */
  routePrefix: string;
  badgeClass: string;
  capabilities: string[];
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: "patient",
    label: "PATIENT",
    storedRole: "ROLE_PATIENT",
    description: "Personal health record and self-service booking.",
    dashboardPath: "/patient/dashboard",
    routePrefix: "/patient",
    badgeClass:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    capabilities: [
      "Book, reschedule and cancel their own appointments",
      "Chat with the AI assistant and escalate to a secretary",
      "Request and download their own documents",
      "Rate a doctor after a completed consultation",
      "View and edit their own profile",
    ],
  },
  {
    key: "doctor",
    label: "DOCTOR",
    storedRole: "ROLE_DOCTOR",
    description: "Clinical features, limited to their own patients.",
    dashboardPath: "/doctor/dashboard",
    routePrefix: "/doctor",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    capabilities: [
      "See only patients who have booked with them",
      "Read their own patients' AI conversations (read-only)",
      "Manage their availability and time off",
      "Run live consultations and write consultation notes",
      "Create follow-up recommendations",
    ],
  },
  {
    key: "secretary",
    label: "SECRETARY",
    storedRole: "ROLE_SECRETARY",
    description: "Front-desk operations across the whole clinic.",
    dashboardPath: "/secretary/dashboard",
    routePrefix: "/secretary",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    capabilities: [
      "See clinic-wide appointments and patients",
      "Accept and answer patient live chats",
      "Process document requests",
      "Decide schedule adjustment requests",
      "Book follow-ups on a patient's behalf",
    ],
  },
  {
    key: "admin",
    label: "ADMIN",
    storedRole: "ROLE_ADMIN",
    description: "Platform administration. Not a clinical role.",
    dashboardPath: "/admin/dashboard",
    routePrefix: "/admin",
    badgeClass:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    capabilities: [
      "Create, edit, activate/deactivate and delete users",
      "Assign any of the four roles",
      "Manage specialties",
      "Read all doctor ratings",
    ],
  },
];

export const ROLE_KEYS = ROLE_DEFINITIONS.map((r) => r.key);

export function roleDefinition(key: string): RoleDefinition | undefined {
  return ROLE_DEFINITIONS.find((r) => r.key === key);
}

/** Badge classes keyed by role, for tables and chips. */
export const ROLE_BADGE_CLASS: Record<string, string> = Object.fromEntries(
  ROLE_DEFINITIONS.map((r) => [r.key, r.badgeClass]),
);

/** Where each role lands after signing in. */
export const ROLE_DASHBOARD_PATH: Record<string, string> = Object.fromEntries(
  ROLE_DEFINITIONS.map((r) => [r.key, r.dashboardPath]),
);
