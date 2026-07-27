import { useCallback, useEffect, useRef, useState } from "react";
import { notificationService, type AppNotification } from "@/services/consultation";

/** How often to ask the server for new notifications, in milliseconds. */
const POLL_INTERVAL_MS = 15_000;

/**
 * Keeps the signed-in user's notifications current.
 *
 * ---------------------------------------------------------------------------
 * WHY POLLING, AND HOW TO REPLACE IT
 *
 * The backend runs on PHP's built-in server, which handles one request at a
 * time and closes the connection after each — it cannot hold a WebSocket open.
 * A real-time transport needs a separate long-running process.
 *
 * This hook is the seam. To switch, open the socket in the effect below and
 * call `merge()` on each pushed message instead of on each poll response; keep
 * one catch-up `list(since)` call on connect so anything missed while
 * disconnected still arrives. Nothing that consumes this hook changes.
 * ---------------------------------------------------------------------------
 *
 * Polling is incremental: only ids above the highest one already held come
 * back, so a quiet clinic costs an empty array every 15 seconds.
 */
export function useNotifications(enabled = true) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Read inside the interval callback, so it never becomes a stale closure and
  // never has to be an effect dependency.
  const cursor = useRef(0);

  const merge = useCallback((incoming: AppNotification[]) => {
    if (incoming.length === 0) return;

    setNotifications((current) => {
      const seen = new Set(current.map((n) => n.id));
      const fresh = incoming.filter((n) => !seen.has(n.id));
      if (fresh.length === 0) return current;
      return [...fresh, ...current].sort((a, b) => b.id - a.id).slice(0, 100);
    });
  }, []);

  const poll = useCallback(
    async (full = false) => {
      try {
        const data = await notificationService.list(full ? undefined : cursor.current || undefined);
        if (full) setNotifications(data.notifications);
        else merge(data.notifications);

        setUnreadCount(data.unreadCount);
        cursor.current = Math.max(cursor.current, data.latestId);
        setError(null);
      } catch (err) {
        // A failed poll is not worth shouting about — the next one may work.
        setError(err instanceof Error ? err.message : "Could not fetch notifications.");
      }
    },
    [merge],
  );

  useEffect(() => {
    if (!enabled) return;

    void poll(true);
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);

    // Coming back to the tab should feel instant rather than waiting out the
    // remainder of the interval.
    const onFocus = () => void poll();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, poll]);

  const markRead = useCallback(async (id: number) => {
    // Optimistic: the badge should drop the moment it is clicked.
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await notificationService.markRead(id);
    } catch {
      void poll(true);
    }
  }, [poll]);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllRead();
    } catch {
      void poll(true);
    }
  }, [poll]);

  return { notifications, unreadCount, error, refresh: () => poll(true), markRead, markAllRead };
}
