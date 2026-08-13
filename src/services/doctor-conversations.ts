/**
 * Doctor's read-only view of their patients' AI conversations.
 *
 * There is no write counterpart on purpose — the backend exposes GET routes
 * only, so a doctor can read a transcript but never change it.
 *
 * Filtering is sent to the server rather than applied here: the doctor's
 * browser is never given conversations it is then trusted to hide.
 */
import { API_BASE_URL, authHeader } from "@/lib/api-config";
import type { AiConversationStatus } from "@/types/doctor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DoctorAiConversation = {
  id: number;
  patientId: number;
  patientName: string;
  /** YYYY-MM-DD, the day the conversation started. */
  date: string;
  startedAt: string;
  status: AiConversationStatus;
  messageCount: number;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageBy: "patient" | "ai" | "secretary" | null;
  /** Set once a secretary has been involved. */
  secretaryName: string | null;
};

export type DoctorAiConversationDetail = DoctorAiConversation & {
  patientEmail: string;
  acceptedAt: string | null;
  closedAt: string | null;
};

export type DoctorAiMessage = {
  id: number;
  role: "patient" | "ai" | "secretary" | "doctor";
  senderName: string;
  content: string;
  createdAt: string;
};

export type DoctorConversationFilters = {
  /** Search by patient name or email. */
  q?: string;
  /** YYYY-MM-DD. */
  date?: string;
  /** "all" or a conversation status. */
  status?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function get<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", ...authHeader() },
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

/** Drop empty/"all" values so they are not sent as meaningless filters. */
function cleanFilters(filters: DoctorConversationFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.q?.trim()) params.q = filters.q.trim();
  if (filters.date) params.date = filters.date;
  if (filters.status && filters.status !== "all") params.status = filters.status;
  return params;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const doctorConversationService = {
  /** Conversations belonging to this doctor's own patients, newest first. */
  async list(filters: DoctorConversationFilters = {}): Promise<DoctorAiConversation[]> {
    const data = await get<{ conversations: DoctorAiConversation[] }>(
      "/doctor/conversations",
      cleanFilters(filters),
    );
    return data.conversations;
  },

  /**
   * One full transcript: patient, AI, and secretary messages.
   * Rejects with `status === 404` when the conversation is not this doctor's.
   */
  async detail(
    id: number,
  ): Promise<{ conversation: DoctorAiConversationDetail; messages: DoctorAiMessage[] }> {
    return get<{
      conversation: DoctorAiConversationDetail;
      messages: DoctorAiMessage[];
    }>("/doctor/conversations/get", { id });
  },
};
