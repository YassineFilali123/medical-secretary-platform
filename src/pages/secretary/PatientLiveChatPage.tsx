import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { realtime } from "@/lib/realtime";
import { useLiveChatListSocket, useLiveChatSocket } from "@/hooks/useLiveChatSocket";
import { ConnectionStatus } from "@/components/shared/ConnectionStatus";
import {
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  UserCheck,
  Users,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  liveChatService,
  type ApiError,
  type LiveChat,
  type LiveChatMessage,
} from "@/services/live-chat";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? "").toUpperCase())
    .join("");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PatientAvatar({ name }: { name: string }) {
  const colours = [
    "bg-violet-500", "bg-sky-500", "bg-emerald-500",
    "bg-amber-500", "bg-rose-500", "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bg = colours[Math.abs(hash) % colours.length] ?? "bg-violet-500";

  return (
    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${bg}`}>
      {initials(name)}
    </div>
  );
}

function WaitingChatCard({
  chat,
  onAccept,
  accepting,
}: {
  chat: LiveChat;
  onAccept: (chatId: number) => void;
  accepting: boolean;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <PatientAvatar name={chat.patientName ?? `Patient #${chat.patientId}`} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">
            {chat.patientName ?? `Patient #${chat.patientId}`}
          </p>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            <span>Waiting · {relativeTime(chat.createdAt)}</span>
          </div>
        </div>
        <button
          onClick={() => onAccept(chat.id)}
          disabled={accepting}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-60"
        >
          {accepting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserCheck className="h-3.5 w-3.5" />
          )}
          Accept
        </button>
      </div>
    </div>
  );
}

function ActiveChatRow({
  chat,
  selected,
  onClick,
}: {
  chat: LiveChat;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-accent/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <PatientAvatar name={chat.patientName ?? `Patient #${chat.patientId}`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-foreground">
            {chat.patientName ?? `Patient #${chat.patientId}`}
          </p>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>Active · {relativeTime(chat.acceptedAt ?? chat.createdAt)}</span>
          </div>
        </div>
        <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      </div>
    </button>
  );
}

function ChatMessageBubble({ msg }: { msg: LiveChatMessage }) {
  const isSecretary = msg.senderRole === "secretary";
  return (
    <div className={`flex ${isSecretary ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[80%] flex-col ${isSecretary ? "items-end" : "items-start"}`}>
        <p className="mb-0.5 text-[10px] text-muted-foreground">
          {isSecretary ? "You" : msg.senderName}
        </p>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isSecretary
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-muted text-foreground"
          }`}
        >
          {msg.content}
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast notification (inline, no external dep)
// ---------------------------------------------------------------------------

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: "error" | "success";
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-elevated text-sm font-medium transition-all ${
        type === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      }`}
    >
      {type === "error" ? (
        <AlertCircle className="h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      )}
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PatientLiveChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [waitingChats, setWaitingChats] = useState<LiveChat[]>([]);
  const [activeChats, setActiveChats] = useState<LiveChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [loadingWaiting, setLoadingWaiting] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const lastMsgIdRef = useRef(0);
  const messagesBottomRef = useRef<HTMLDivElement>(null);

  const selectedChat =
    activeChats.find((c) => c.id === selectedChatId) ?? null;

  // ── Scroll to bottom when messages change ────────────────────────────────
  useEffect(() => {
    messagesBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Fetch waiting queue ──────────────────────────────────────────────────
  const fetchWaiting = useCallback(async () => {
    try {
      const chats = await liveChatService.waitingQueue();
      setWaitingChats(chats);
    } catch {
      // silently retry on next poll
    } finally {
      setLoadingWaiting(false);
    }
  }, []);

  // ── Fetch secretary's active chats ───────────────────────────────────────
  const fetchActive = useCallback(async () => {
    try {
      const chats = await liveChatService.myActiveChats();
      setActiveChats(chats);

      // If our selected chat was closed externally, deselect it.
      if (selectedChatId !== null) {
        const stillActive = chats.find((c) => c.id === selectedChatId);
        if (!stillActive) {
          setSelectedChatId(null);
          setMessages([]);
          lastMsgIdRef.current = 0;
        }
      }
    } catch {
      // silently retry on next poll
    }
  }, [selectedChatId]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  // Messages now arrive over the WebSocket instead of a 3-second poll. History
  // is still loaded over HTTP in openChat(); this only appends what comes after.
  const handleRealtimeMessage = useCallback((message: LiveChatMessage) => {
    setMessages((prev) => {
      // The sender already appended its own message optimistically, and a
      // reconnect can redeliver — so ignore anything already held.
      if (prev.some((m) => m.id === message.id)) return prev;
      lastMsgIdRef.current = Math.max(lastMsgIdRef.current, message.id);
      return [...prev, message];
    });
  }, []);

  const handleChatEvent = useCallback(
    (event: "accepted" | "closed") => {
      if (event === "closed") fetchActive();
    },
    [fetchActive],
  );

  const { status: socketStatus } = useLiveChatSocket(
    selectedChatId,
    handleRealtimeMessage,
    handleChatEvent,
  );

  // The queue and the assigned-chat list are refreshed by socket events (a
  // patient joining, an accept, a close) rather than on a timer.
  useLiveChatListSocket();

  // Initial load
  useEffect(() => {
    fetchWaiting();
    fetchActive();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket events invalidate the React Query live-chat keys; mirror that into
  // this page's local lists, which predate those queries.
  useEffect(() => {
    const off = realtime.onEvent((event) => {
      if (event.type === "waiting" || event.type === "accepted" || event.type === "closed") {
        fetchWaiting();
        fetchActive();
      }
    });
    return off;
  }, [fetchWaiting, fetchActive]);

  // Open the conversation named in ?chatId=, so Active Conversations can link
  // straight into this interface instead of duplicating it. Runs once the
  // active list has arrived, and only for a chat this secretary actually owns —
  // the list itself is already scoped to them by the server.
  useEffect(() => {
    const requested = Number(searchParams.get("chatId"));
    if (!Number.isInteger(requested) || requested <= 0) return;
    if (selectedChatId === requested) return;
    if (!activeChats.some((c) => c.id === requested)) return;

    void openChat(requested);
    // Drop the parameter once consumed so a later manual selection is not
    // undone by this effect re-firing.
    setSearchParams({}, { replace: true });
    // openChat is redefined each render; depending on it would re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChats, searchParams, selectedChatId, setSearchParams]);

  // ── Open a chat (load all messages) ─────────────────────────────────────
  const openChat = async (chatId: number) => {
    if (chatId === selectedChatId) return;
    setSelectedChatId(chatId);
    setMessages([]);
    lastMsgIdRef.current = 0;
    setLoadingMessages(true);
    try {
      const res = await liveChatService.messages(chatId, 0);
      setMessages(res.messages);
      if (res.messages.length > 0) {
        lastMsgIdRef.current = res.messages[res.messages.length - 1]!.id;
      }
    } catch {
      setToast({ message: "Could not load messages.", type: "error" });
    } finally {
      setLoadingMessages(false);
    }
  };

  // ── Accept a waiting chat ────────────────────────────────────────────────
  const handleAccept = async (chatId: number) => {
    setAcceptingId(chatId);
    try {
      await liveChatService.accept(chatId);
      setToast({ message: "Chat accepted! The patient has been notified.", type: "success" });
      // Refresh both lists immediately.
      await Promise.all([fetchWaiting(), fetchActive()]);
      // Open the chat straight away.
      await openChat(chatId);
    } catch (err) {
      const failure = err as ApiError;
      const status = failure?.status ?? 0;
      if (status === 409) {
        setToast({
          message: "This chat was already accepted by another secretary.",
          type: "error",
        });
        // Remove from local waiting list so the card disappears.
        setWaitingChats((prev) => prev.filter((c) => c.id !== chatId));
      } else {
        setToast({ message: failure?.message ?? "Could not accept chat.", type: "error" });
      }
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Send a message ───────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!chatInput.trim() || isSending || selectedChatId === null) return;
    const content = chatInput.trim();
    setChatInput("");
    setIsSending(true);
    try {
      const msg = await liveChatService.sendMessage(selectedChatId, content);
      setMessages((prev) => [...prev, msg]);
      lastMsgIdRef.current = msg.id;
    } catch {
      setChatInput(content); // restore on failure
      setToast({ message: "Failed to send message.", type: "error" });
    } finally {
      setIsSending(false);
    }
  };

  // ── Close a chat ─────────────────────────────────────────────────────────
  const handleClose = async () => {
    if (selectedChatId === null || isClosing) return;
    setIsClosing(true);
    try {
      await liveChatService.close(selectedChatId);
      setToast({ message: "Chat closed successfully.", type: "success" });
      setSelectedChatId(null);
      setMessages([]);
      lastMsgIdRef.current = 0;
      await fetchActive();
    } catch (err) {
      setToast({
        message: (err as Error)?.message ?? "Could not close chat.",
        type: "error",
      });
    } finally {
      setIsClosing(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-soft">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Patient Live Chat</h1>
            <p className="text-xs text-muted-foreground">Accept and manage live chat sessions</p>
          </div>
        </div>
        <button
          onClick={() => { fetchWaiting(); fetchActive(); }}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── LEFT COLUMN: queues ─────────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-1">

          {/* Waiting Chats */}
          <div className="rounded-2xl border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold">Waiting Chats</h2>
              </div>
              {waitingChats.length > 0 && (
                <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {waitingChats.length}
                </span>
              )}
            </div>
            <div className="space-y-3 p-4">
              {loadingWaiting ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : waitingChats.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No patients waiting</p>
                </div>
              ) : (
                waitingChats.map((chat) => (
                  <WaitingChatCard
                    key={chat.id}
                    chat={chat}
                    onAccept={handleAccept}
                    accepting={acceptingId === chat.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Active Chats */}
          <div className="rounded-2xl border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-semibold">My Active Chats</h2>
              </div>
              {activeChats.length > 0 && (
                <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {activeChats.length}
                </span>
              )}
            </div>
            <div className="space-y-2 p-4">
              {activeChats.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <MessageCircle className="h-7 w-7 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No active chats</p>
                </div>
              ) : (
                activeChats.map((chat) => (
                  <ActiveChatRow
                    key={chat.id}
                    chat={chat}
                    selected={chat.id === selectedChatId}
                    onClick={() => openChat(chat.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: conversation detail ───────────────────────── */}
        <div className="lg:col-span-2">
          {selectedChat ? (
            <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-soft">
              {/* Chat header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <PatientAvatar name={selectedChat.patientName ?? `Patient #${selectedChat.patientId}`} />
                  <div>
                    <p className="font-semibold text-foreground">
                      {selectedChat.patientName ?? `Patient #${selectedChat.patientId}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        Active since{" "}
                        {selectedChat.acceptedAt
                          ? new Date(selectedChat.acceptedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </p>
                      <ConnectionStatus status={socketStatus} />
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isClosing}
                  className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-60 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
                >
                  {isClosing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  End Chat
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto p-5" style={{ minHeight: "300px", maxHeight: "480px" }}>
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <MessageCircle className="h-10 w-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground/60">
                      Send a greeting to start the conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => <ChatMessageBubble key={msg.id} msg={msg} />)
                )}
                <div ref={messagesBottomRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border p-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a response…"
                    className="h-11 rounded-xl"
                    disabled={isSending}
                  />
                  <button
                    aria-label="Send reply"
                    onClick={handleSend}
                    disabled={!chatInput.trim() || isSending}
                    className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-white shadow-soft transition-opacity disabled:opacity-50 hover:opacity-90"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[500px] items-center justify-center rounded-2xl border border-border bg-card shadow-soft">
              <div className="text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-400/20 to-teal-600/20">
                  <MessageCircle className="h-8 w-8 text-teal-500" />
                </div>
                <p className="text-sm font-medium text-foreground">No chat selected</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Accept a waiting chat or open an active conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
