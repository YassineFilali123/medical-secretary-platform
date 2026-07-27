/**
 * Single source of truth for the backend base URL.
 *
 * The PHP backend serves from http://localhost:8080/api (see backend/router.php).
 * Override per environment with VITE_API_URL in .env / .env.production.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export const TOKEN_KEY = "access_token";

export function authHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
