/**
 * Admin management of the AI assistant: settings, FAQ, conversation scenarios.
 *
 * Every endpoint here is admin-only in the backend (AdminAiController).
 *
 * The Gemini API key is never part of this surface. `gemini.configured` is a
 * boolean the server derives from its own environment — the credential itself
 * never leaves the backend.
 */
import { API_BASE_URL, authHeader } from "@/lib/api-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AiSettings = {
  assistant_enabled: boolean;
  faq_enabled: boolean;
  welcome_message: string;
  fallback_message: string;
};

export type GeminiInfo = {
  /** Whether a key is present in the server environment. Never the key itself. */
  configured: boolean;
  model: string;
  note: string;
};

export type AiFaq = {
  id: number;
  intentId: number | null;
  intentName: string | null;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string | null;
};

export type AiScenario = {
  id: number;
  name: string;
  description: string | null;
  priority: number;
  isActive: boolean;
  keywords: string[];
  keywordCount: number;
  faqCount: number;
  /** Implemented by AiChatController — can be disabled but not renamed or deleted. */
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type FaqInput = {
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  intentId?: number | null;
  sortOrder?: number;
};

export type ScenarioInput = {
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  keywords: string[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new Error(`Cannot reach the server. Is the backend running on ${API_BASE_URL}?`);
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned an invalid response (HTTP ${response.status}).`);
  }

  if (!data.success) {
    const err = new Error((data.error as string) || `Request failed (HTTP ${response.status}).`);
    (err as { status?: number }).status = response.status;
    throw err;
  }

  return data as unknown as T;
}

function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  return request<T>(`${path}${qs ? `?${qs}` : ""}`, { method: "GET" });
}

function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const adminAiService = {
  // --- Settings ---------------------------------------------------------
  getSettings: () => get<{ settings: AiSettings; gemini: GeminiInfo }>("/admin/ai/settings"),

  updateSettings: (patch: Partial<AiSettings>) =>
    post<{ settings: AiSettings; gemini: GeminiInfo; message: string }>(
      "/admin/ai/settings",
      patch as Record<string, unknown>,
    ),

  // --- FAQ --------------------------------------------------------------
  listFaqs: (filters: { q?: string; category?: string; status?: string } = {}) => {
    const params: Record<string, string> = {};
    if (filters.q?.trim()) params.q = filters.q.trim();
    if (filters.category && filters.category !== "all") params.category = filters.category;
    if (filters.status && filters.status !== "all") params.status = filters.status;
    return get<{ faqs: AiFaq[]; categories: string[] }>("/admin/ai/faqs", params);
  },

  createFaq: (input: FaqInput) =>
    post<{ faq: AiFaq }>("/admin/ai/faqs/create", input as unknown as Record<string, unknown>),

  updateFaq: (id: number, input: Partial<FaqInput>) =>
    post<{ faq: AiFaq }>("/admin/ai/faqs/update", { id, ...input }),

  toggleFaq: (id: number) => post<{ faq: AiFaq }>("/admin/ai/faqs/toggle", { id }),

  deleteFaq: (id: number) => post<{ id: number }>("/admin/ai/faqs/delete", { id }),

  // --- Scenarios --------------------------------------------------------
  listScenarios: () => get<{ scenarios: AiScenario[] }>("/admin/ai/scenarios"),

  createScenario: (input: ScenarioInput) =>
    post<{ scenario: AiScenario }>(
      "/admin/ai/scenarios/create",
      input as unknown as Record<string, unknown>,
    ),

  updateScenario: (id: number, input: Partial<ScenarioInput>) =>
    post<{ scenario: AiScenario }>("/admin/ai/scenarios/update", { id, ...input }),

  toggleScenario: (id: number) =>
    post<{ scenario: AiScenario }>("/admin/ai/scenarios/toggle", { id }),

  deleteScenario: (id: number) => post<{ id: number }>("/admin/ai/scenarios/delete", { id }),
};
