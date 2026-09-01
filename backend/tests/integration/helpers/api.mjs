/**
 * HTTP client for the integration suite.
 *
 * Every call goes to the real API on localhost:8080 — the same endpoints the
 * browser uses. Nothing is stubbed, so a passing test means the route, the
 * controller, the authorisation check and the database all worked together.
 */

export const API = process.env.API_BASE_URL ?? "http://localhost:8080/api";

/** `Bearer token_<id>` is this project's token format. */
export const tokenFor = (userId) => `token_${userId}`;

async function request(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    // A confusing timeout deep inside a test is much harder to diagnose than
    // being told plainly that the backend is not running.
    throw new Error(
      `Cannot reach the API at ${API}. Start it with:\n` +
        `  npm run backend\n` +
        `(original error: ${err?.message ?? err})`,
    );
  }

  let json = null;
  try {
    json = await response.json();
  } catch {
    // Some endpoints stream files; callers that care check `status`.
  }

  return { status: response.status, body: json };
}

export const get = (path, token) => request("GET", path, { token });
export const post = (path, token, body = {}) => request("POST", path, { token, body });

/** Fails fast with a useful message when the suite is run without the API up. */
export async function assertApiReachable() {
  const { status } = await get("/specialties", tokenFor(1));
  if (status === 0) throw new Error(`API at ${API} is not responding.`);
}
