import { API_BASE_URL, TOKEN_KEY } from "@/lib/api-config";

/**
 * WebSocket client for Live Chat.
 *
 * WHAT IT DOES AND DOES NOT DO
 *   It carries real-time updates only. Messages are still SENT over the
 *   existing HTTP API (POST /livechat/message) and history is still LOADED over
 *   HTTP (GET /livechat/messages). This socket exists so the other party learns
 *   about a message without asking — it is not a second chat system, and it
 *   never writes to the database.
 *
 *   Because of that, a dropped socket degrades to "updates arrive on the next
 *   load" rather than to "chat is broken".
 *
 * One socket is shared by the whole tab. Components subscribe to the
 * conversations they are showing; the server refuses any subscription the
 * backend would refuse over HTTP.
 */

export type RealtimeStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

export type RealtimeEvent =
  | { type: "ready"; user: { id: number; role: string } }
  | { type: "subscribed"; chatId: number }
  | { type: "subscribe_error"; chatId: number; error: string }
  | { type: "message"; chatId: number; data: LiveChatEventMessage }
  | { type: "accepted"; chatId: number; data: unknown }
  | { type: "closed"; chatId: number; data: unknown }
  | { type: "waiting"; chatId: number; data: unknown }
  | { type: "auth_error"; error: string }
  | { type: "error"; error: string };

export type LiveChatEventMessage = {
  id: number;
  senderRole: "patient" | "secretary";
  senderName: string;
  content: string;
  createdAt: string;
};

type Listener = (event: RealtimeEvent) => void;
type StatusListener = (status: RealtimeStatus) => void;

/** ws://host:8081/ws, derived from the API URL so one env var configures both. */
function socketUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit) return explicit;

  try {
    const api = new URL(API_BASE_URL, window.location.origin);
    const protocol = api.protocol === "https:" ? "wss:" : "ws:";
    const port = import.meta.env.VITE_WS_PORT ?? "8081";
    return `${protocol}//${api.hostname}:${port}/ws`;
  } catch {
    return "ws://localhost:8081/ws";
  }
}

class RealtimeClient {
  private socket: WebSocket | null = null;
  private status: RealtimeStatus = "disconnected";
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();

  /** Conversations this tab wants to be in, re-sent after every reconnect. */
  private desiredRooms = new Set<number>();
  /** Whether this tab watches the secretary waiting queue. */
  private wantsLobby = false;

  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private intentionallyClosed = false;

  // -- public API ----------------------------------------------------------

  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return; // Signed out: nothing to authenticate with.

    this.intentionallyClosed = false;
    this.setStatus(this.reconnectAttempts === 0 ? "connecting" : "reconnecting");

    // The token goes in the query string because a browser cannot set headers
    // on a WebSocket handshake. The server verifies it against /api/profile.
    const ws = new WebSocket(`${socketUrl()}?token=${encodeURIComponent(token)}`);
    this.socket = ws;

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus("connected");
      // Subscriptions are NOT sent here. The server verifies the token against
      // the API before it will accept one, so anything sent now would be
      // refused for a reason that is about to stop being true. They go out on
      // "ready" instead.
    };

    ws.onmessage = (raw) => {
      let event: RealtimeEvent;
      try {
        event = JSON.parse(raw.data as string);
      } catch {
        return;
      }

      // Authenticated: (re-)join everything this tab was watching. This is what
      // restores subscriptions after a reconnect.
      if (event.type === "ready") {
        for (const chatId of this.desiredRooms) this.send({ type: "subscribe", chatId });
        if (this.wantsLobby) this.send({ type: "subscribe_lobby" });
      }

      for (const listener of this.listeners) listener(event);
    };

    ws.onclose = () => {
      this.socket = null;
      if (this.intentionallyClosed) {
        this.setStatus("disconnected");
        return;
      }
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose always follows; reconnection is handled there.
    };
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.desiredRooms.clear();
    this.socket?.close();
    this.socket = null;
    this.setStatus("disconnected");
  }

  /** Secretary queue updates. Refused by the server for any other role. */
  subscribeLobby(): void {
    this.wantsLobby = true;
    this.connect();
    this.send({ type: "subscribe_lobby" });
  }

  unsubscribeLobby(): void {
    this.wantsLobby = false;
    this.send({ type: "unsubscribe_lobby" });
  }

  subscribe(chatId: number): void {
    this.desiredRooms.add(chatId);
    this.connect();
    this.send({ type: "subscribe", chatId });
  }

  unsubscribe(chatId: number): void {
    this.desiredRooms.delete(chatId);
    this.send({ type: "unsubscribe", chatId });
  }

  onEvent(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): RealtimeStatus {
    return this.status;
  }

  // -- internals -----------------------------------------------------------

  private send(payload: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
    // Otherwise it is replayed from desiredRooms on the next open.
  }

  private setStatus(status: RealtimeStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }

  /**
   * Exponential backoff, capped at 15s and jittered so a server restart does
   * not bring every open tab back in the same millisecond.
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;

    this.reconnectAttempts += 1;
    this.setStatus("reconnecting");

    const base = Math.min(15_000, 500 * 2 ** Math.min(this.reconnectAttempts, 5));
    const delay = base + Math.random() * 500;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

export const realtime = new RealtimeClient();
