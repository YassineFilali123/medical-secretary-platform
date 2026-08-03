import { Bell, CheckCheck, Siren } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";
import { playNotificationSound } from "@/hooks/useLiveConsultation";

/**
 * Live notification bell.
 *
 * Plays a sound when new unread notifications arrive.
 * Backed by useNotifications, which polls incrementally.
 */
export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const prevUnread = useRef(unreadCount);

  // Play sound when unread count increases (new notification arrived)
  useEffect(() => {
    if (unreadCount > prevUnread.current && prevUnread.current >= 0) {
      playNotificationSound();
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent focus-ring"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {/* Only when there is genuinely something unread — a dot that is
              always lit tells the user nothing. */}
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-[18px] text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.isRead && void markRead(n.id)}
                className={`flex w-full gap-2.5 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent/50 ${
                  n.isRead ? "opacity-60" : ""
                }`}
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    n.isRead ? "bg-transparent" : n.isUrgent ? "bg-destructive" : "bg-primary"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {n.isUrgent && <Siren className="h-3 w-3 shrink-0 text-destructive" />}
                    <span className="truncate">{n.title}</span>
                  </span>
                  {n.body && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground/70">
                    {formatWhen(n.createdAt)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "2026-07-26 21:04:11" -> "just now" / "12 min ago" / "26 Jul 21:04". */
function formatWhen(timestamp: string): string {
  // MySQL DATETIME has a space, which Safari refuses to parse; make it ISO.
  const when = new Date(timestamp.replace(" ", "T"));
  if (Number.isNaN(when.getTime())) return timestamp;

  const minutes = Math.floor((Date.now() - when.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;

  return when.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
