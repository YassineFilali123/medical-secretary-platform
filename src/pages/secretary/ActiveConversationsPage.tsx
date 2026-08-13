import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpDown,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Search,
  UserCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type LiveChat } from "@/services/live-chat";
import { useMyActiveChatsQuery } from "@/hooks/queries/useLiveChatQueries";

const SORT_OPTIONS = [
  { value: "recent", label: "Most recent message" },
  { value: "unread", label: "Unread first" },
  { value: "oldest", label: "Oldest first" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

/** "2026-08-12 09:14:00" → a short relative label. */
function relativeTime(value: string | null | undefined): string {
  if (!value) return "—";

  const then = new Date(value.replace(" ", "T")).getTime();
  if (Number.isNaN(then)) return "—";

  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

function clockTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.replace(" ", "T"));
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ActiveConversationsPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  // The server returns only conversations that are 'active' AND assigned to the
  // signed-in secretary — the filter is not applied here. React Query's
  // refetchInterval replaces the hand-rolled 5s polling loop, and keeps showing
  // the previous data while a refetch is in flight rather than flashing empty.
  const {
    data: chats = [],
    isPending: loading,
    error: queryError,
    refetch,
  } = useMyActiveChatsQuery();

  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? "Could not load active conversations."
        : null;

  const load = useCallback(() => {
    void refetch();
  }, [refetch]);

  const visible = useMemo(() => {
    let result = [...chats];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          (c.patientName ?? "").toLowerCase().includes(q) ||
          (c.lastMessage ?? "").toLowerCase().includes(q),
      );
    }

    const time = (c: LiveChat) =>
      new Date((c.lastMessageAt ?? c.acceptedAt ?? c.createdAt).replace(" ", "T")).getTime();

    result.sort((a, b) => {
      if (sort === "unread") {
        const diff = (b.unreadCount ?? 0) - (a.unreadCount ?? 0);
        if (diff !== 0) return diff;
        return time(b) - time(a);
      }
      if (sort === "oldest") return time(a) - time(b);
      return time(b) - time(a);
    });

    return result;
  }, [chats, search, sort]);

  const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  /** Opens the existing Live Chat interface with this conversation selected. */
  const openChat = (chat: LiveChat) => navigate(`/secretary/live-chat?chatId=${chat.id}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Active Conversations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading…"
              : `${chats.length} ${chats.length === 1 ? "conversation" : "conversations"} assigned to you` +
                (totalUnread > 0 ? ` · ${totalUnread} unread` : "")}
          </p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => navigate("/secretary/live-chat")}>
          <MessageSquare className="mr-2 h-4 w-4" /> Waiting requests
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient or message..."
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort conversations"
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            {search
              ? "No conversations match your search."
              : "You have no active conversations. Accept a waiting request to start one."}
          </p>
          {!search && (
            <Button
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => navigate("/secretary/live-chat")}
            >
              Go to waiting requests
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((c) => {
            const unread = c.unreadCount ?? 0;

            return (
              <button
                key={c.id}
                onClick={() => openChat(c)}
                className={`group flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  unread > 0
                    ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                    : "border-border bg-card hover:bg-accent/40"
                }`}
              >
                <div className="relative shrink-0">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials(c.patientName)}
                  </div>
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {unread}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`truncate text-sm ${unread > 0 ? "font-semibold" : "font-medium"}`}>
                      {c.patientName ?? "Unknown patient"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {c.status}
                    </span>
                  </div>

                  <p
                    className={`mt-1 truncate text-xs ${
                      unread > 0 ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {c.lastMessage ? (
                      <>
                        <span className="font-medium">
                          {c.lastMessageRole === "secretary" ? "You: " : ""}
                        </span>
                        {c.lastMessage}
                      </>
                    ) : (
                      <span className="italic">No messages yet.</span>
                    )}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Started {clockTime(c.acceptedAt ?? c.createdAt)}
                    </span>
                    <span>Last message {relativeTime(c.lastMessageAt)}</span>
                    {c.secretaryName && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />
                        {c.secretaryName}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
