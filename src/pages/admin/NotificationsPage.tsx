import { useState, useMemo } from "react";
import { AlertCircle, Bell, Info, CheckCheck, RefreshCw } from "lucide-react";
import { adminService } from "@/services/admin";

const typeIcons: Record<string, React.ElementType> = {
  alert: AlertCircle,
  system: Info,
  update: RefreshCw,
};

const typeStyles: Record<string, string> = {
  alert: "border-destructive/20 bg-destructive/5",
  system: "border-primary/20 bg-primary/5",
  update: "border-green-200 bg-green-50/50",
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState(() => adminService.getNotifications());
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const markRead = (id: string) => {
    adminService.markNotificationRead(id);
    setNotifications(adminService.getNotifications());
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">{unreadCount} unread notifications</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "all", label: "All" },
          { key: "unread", label: "Unread" },
          { key: "alert", label: "Alerts" },
          { key: "system", label: "System" },
          { key: "update", label: "Updates" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
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
            const Icon = typeIcons[n.type] ?? Bell;
            const style = typeStyles[n.type] ?? "";
            return (
              <div key={n.id} className={`rounded-2xl border p-4 shadow-soft transition-colors ${style} ${!n.read ? "ring-1 ring-primary/20" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 grid h-8 w-8 place-items-center rounded-lg ${
                      n.type === "alert" ? "bg-destructive/10 text-destructive" : n.type === "system" ? "bg-primary/10 text-primary" : "bg-green-100 text-green-600"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{n.title}</span>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                      <span className="mt-1.5 block text-xs text-muted-foreground">{n.time}</span>
                    </div>
                  </div>
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-accent" aria-label="Mark as read">
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
