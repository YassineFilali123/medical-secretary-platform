import { useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCheck,
  FileText,
  Loader2,
  MessageSquare,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";

/**
 * The signed-in user's notifications, straight from `/api/notifications`.
 *
 * Shared by all four role pages so there is one implementation rather than four
 * near-identical ones. Scope is the server's job — the endpoint returns only
 * rows whose user_id matches the token, so no role prop is needed.
 */

/** Notification `type` values are dotted, e.g. "live_chat.new_message". */
function group(type: string): "appointment" | "message" | "document" | "consultation" | "system" {
  if (type.startsWith("live_chat")) return "message";
  if (type.startsWith("document")) return "document";
  if (type.startsWith("consultation")) return "consultation";
  if (type.startsWith("appointment") || type.startsWith("followup")) return "appointment";
  return "system";
}

const GROUP_ICON: Record<string, React.ElementType> = {
  appointment: Calendar,
  message: MessageSquare,
  document: FileText,
  consultation: Stethoscope,
  system: Bell,
};

const GROUP_STYLE: Record<string, string> = {
  appointment: "bg-primary/10 text-primary",
  message: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  document: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  consultation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  system: "bg-muted text-muted-foreground",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "appointment", label: "Appointments" },
  { key: "message", label: "Messages" },
  { key: "document", label: "Documents" },
  { key: "consultation", label: "Consultations" },
] as const;

/** "2026-08-12 09:14:00" → "12 Aug 2026, 09:14" */
function formatWhen(value: string): string {
  const d = new Date(value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  return (
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export function NotificationsList() {
  const { notifications, unreadCount, error, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.isRead);
    return notifications.filter((n) => group(n.type) === filter);
  }, [notifications, filter]);

  const handleMarkAll = async () => {
    setBusy(true);
    try {
      await markAllRead();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount} unread
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" className="rounded-xl" onClick={handleMarkAll} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
            Mark all as read
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No notifications to show.</p>
          </div>
        ) : (
          filtered.map((n) => {
            const g = group(n.type);
            const Icon = GROUP_ICON[g] ?? Bell;

            return (
              <div
                key={n.id}
                className={`rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors ${
                  !n.isRead ? "ring-1 ring-primary/20" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${GROUP_STYLE[g]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{n.title}</span>
                        {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        {n.isUrgent && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                            urgent
                          </span>
                        )}
                      </div>
                      {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                      <span className="mt-1.5 block text-xs text-muted-foreground">
                        {formatWhen(n.createdAt)}
                      </span>
                    </div>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => void markRead(n.id)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                      aria-label={`Mark "${n.title}" as read`}
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
