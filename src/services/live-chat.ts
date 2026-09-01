import { API_BASE_URL, authHeader } from "@/lib/api-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * An error carrying the HTTP status and the backend's `code`, so callers can
 * tell a lost race (409) from a genuine failure.
 */
export type ApiError = Error & { status?: number; code?: string | null };

export type LiveChatStatus = "waiting" | "active" | "closed";

export type LiveChat = {
  id: number;
  patientId: number;
  patientName: string | null;
  secretaryId: number | null;
  secretaryName: string | null;
  status: LiveChatStatus;
  createdAt: string;
  acceptedAt: string | null;
  closedAt: string | null;

  // Supplied by /livechat/active only, for the Active Conversations list.
  // Optional so the other endpoints returning a LiveChat are unaffected.
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  lastMessageRole?: "patient" | "secretary" | null;
  /** Patient messages the assigned secretary has not read yet. */
  unreadCount?: number;
};

export type LiveChatMessage = {
  id: number;
  senderRole: "patient" | "secretary";
  senderName: string;
  content: string;
  createdAt: string;
};

export type LiveChatMessagesResponse = {
  chat: LiveChat;
  messages: LiveChatMessage[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function request<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
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
    const err: ApiError = new Error(
      (data.error as string) || `Request failed (HTTP ${response.status}).`,
    );
    err.status = response.status;
    err.code = (data.code as string) ?? null;
    throw err;
  }

  return data as unknown as T;
}

function get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return request<T>(`${path}${qs ? `?${qs}` : ""}`, { method: "GET" });
}

function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const liveChatService = {
  /** Patient: start a new live-chat session (or return existing open one). */
  async start(): Promise<LiveChat> {
    const data = await post<{ chat: LiveChat }>("/livechat/start");
    return data.chat;
  },

  /** Patient: get own open (waiting/active) chat. */
  async myChat(): Promise<LiveChat | null> {
    const data = await get<{ chat: LiveChat | null }>("/livechat/my");
    return data.chat;
  },

  /** Secretary: list all waiting chats. */
  async waitingQueue(): Promise<LiveChat[]> {
    const data = await get<{ chats: LiveChat[] }>("/livechat/waiting");
    return data.chats;
  },

  /** Secretary: list own active chats. */
  async myActiveChats(): Promise<LiveChat[]> {
    const data = await get<{ chats: LiveChat[] }>("/livechat/active");
    return data.chats;
  },

  /**
   * Secretary: atomically accept a waiting chat.
   * Throws with `(err as any).status === 409` if already accepted by another secretary.
   */
  async accept(chatId: number): Promise<LiveChat> {
    const data = await post<{ chat: LiveChat }>("/livechat/accept", { chatId });
    return data.chat;
  },

  /**
   * Load messages for a chat.
   * `since` = last known message ID (0 = load all).
   */
  async messages(chatId: number, since = 0): Promise<LiveChatMessagesResponse> {
    return get<LiveChatMessagesResponse>("/livechat/messages", { chatId, since });
  },

  /** Send a message as the authenticated caller (patient or secretary). */
  async sendMessage(chatId: number, content: string): Promise<LiveChatMessage> {
    const data = await post<{ message: LiveChatMessage }>("/livechat/message", {
      chatId,
      content,
    });
    return data.message;
  },

  /** Secretary: close an active chat. */
  async close(chatId: number): Promise<void> {
    await post("/livechat/close", { chatId });
  },

  /**
   * Poll for new messages and chat status.
   * Equivalent to messages() but semantically labelled for polling callers.
   */
  async poll(chatId: number, since = 0): Promise<LiveChatMessagesResponse> {
    return get<LiveChatMessagesResponse>("/livechat/poll", { chatId, since });
  },
};
