/**
 * Test fixtures.
 *
 * ISOLATION FROM REAL DATA
 *   This project has one database and no test copy, so the suite creates
 *   everything it needs and deletes exactly that. Every fixture account uses an
 *   `itest_` email prefix; cleanup removes users matching that prefix and
 *   nothing else, and the foreign keys (all ON DELETE CASCADE) take their
 *   appointments, chats, messages and documents with them.
 *
 *   No pre-existing row is ever updated or deleted. Rows created before the
 *   suite ran are only ever read.
 *
 * Accounts are created through the real POST /api/admin/users/create so the
 * password is hashed by the application itself — which is what makes the login
 * tests meaningful.
 */
import { post, tokenFor } from "./api.mjs";
import { count, exec, scalar } from "./db.mjs";

export const FIXTURE_PREFIX = "itest_";
export const FIXTURE_PASSWORD = "IntegrationTest!234";

/** Unique per run so parallel or repeated runs cannot collide. */
const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
let sequence = 0;

/**
 * Ids created by THIS file.
 *
 * node:test runs each test file in its own process, several at a time. Cleaning
 * up by email prefix would therefore delete the fixtures of every other file
 * still running — which shows up as unrelated 401s and shifting counts. Each
 * file removes only what it made.
 */
const createdUserIds = [];

export function uniqueEmail(role) {
  sequence += 1;
  return `${FIXTURE_PREFIX}${role}_${RUN_ID}_${sequence}@test.local`;
}

/**
 * Register an account this file created by calling the API directly, so
 * cleanup removes it too. Tests that exercise POST /admin/users/create as the
 * thing under test must call this, or the account outlives the run.
 */
export function trackUser(id) {
  const numeric = Number(id);
  if (Number.isInteger(numeric) && numeric > 0) createdUserIds.push(numeric);
  return numeric;
}

/** An existing active administrator, used only to create fixtures. */
export function adminToken() {
  const id = scalar(
    `SELECT id FROM user
      WHERE deleted_at IS NULL AND status='active'
        AND JSON_CONTAINS(roles, '"ROLE_ADMIN"')
      ORDER BY id LIMIT 1`,
  );
  if (!id) {
    throw new Error(
      "No active administrator exists, so fixtures cannot be created. " +
        "Create one before running the suite.",
    );
  }
  return { id: Number(id), token: tokenFor(Number(id)) };
}

/**
 * Create a fixture account of the given role.
 * @returns {{id:number, email:string, password:string, token:string, name:string}}
 */
export async function createUser(role, nameSuffix = "") {
  const { token: admin } = adminToken();
  const email = uniqueEmail(role);
  const name = `ITEST ${role}${nameSuffix ? ` ${nameSuffix}` : ""}`;

  const { status, body } = await post("/admin/users/create", admin, {
    name,
    email,
    password: FIXTURE_PASSWORD,
    role,
    status: "active",
  });

  if (status !== 200 || !body?.success) {
    throw new Error(
      `Could not create ${role} fixture: ${body?.error ?? `HTTP ${status}`}`,
    );
  }

  const id = Number(body.user.id);
  createdUserIds.push(id);
  return { id, email, password: FIXTURE_PASSWORD, token: tokenFor(id), name };
}

/**
 * Give a fixture doctor a wide weekly schedule so slots exist to book.
 * Uses the doctor's own endpoint, as the application does.
 */
export async function giveDoctorAvailability(doctorToken) {
  const schedule = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    isEnabled: true,
    startTime: "08:00",
    endTime: "18:00",
    slotMinutes: 30,
  }));

  const { status, body } = await post("/availability/update", doctorToken, { schedule });
  if (status !== 200 || !body?.success) {
    throw new Error(`Could not set doctor availability: ${body?.error ?? status}`);
  }
  return body;
}

/**
 * Removes the accounts THIS file created, and nothing else.
 *
 * Scoped by id rather than by email prefix so it cannot disturb another test
 * file running at the same time. The cascading foreign keys take the
 * appointments, chats, messages, documents and ratings with them.
 */
export function cleanupFixtures() {
  if (createdUserIds.length === 0) return 0;

  const ids = createdUserIds.join(",");
  exec(`DELETE FROM user WHERE id IN (${ids})`);

  const removed = createdUserIds.length;
  createdUserIds.length = 0;
  return removed;
}

/**
 * Sweeps up every fixture account by prefix, for the standalone cleanup script.
 * Only safe when no suite is running.
 */
export function cleanupAllFixtures() {
  const before = count(`SELECT COUNT(*) FROM user WHERE email LIKE '${FIXTURE_PREFIX}%'`);
  exec(`DELETE FROM user WHERE email LIKE '${FIXTURE_PREFIX}%'`);
  return before;
}

/** How many fixture accounts currently exist — used to prove cleanup worked. */
export function fixtureCount() {
  return count(`SELECT COUNT(*) FROM user WHERE email LIKE '${FIXTURE_PREFIX}%'`);
}

/** YYYY-MM-DD `days` from today, in the server's local calendar. */
export function dateIn(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
