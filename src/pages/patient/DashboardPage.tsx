import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Apple,
  Bell,
  Bot,
  CalendarCheck,
  CalendarClock,
  Clock,
  Droplets,
  FileText,
  Heart,
  Loader2,
  Moon,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppointments } from "@/hooks/useAppointments";
import { useNotifications } from "@/hooks/useNotifications";
import type { Appointment } from "@/types/appointment";

/**
 * General health advice shown in the sidebar.
 *
 * Static editorial copy, not patient data — it is the same for everyone and is
 * deliberately not dressed up as a personalised statistic.
 */
const HEALTH_TIPS = [
  { id: "hydration", icon: Droplets, title: "Stay hydrated", description: "Aim for 1.5–2 litres of water a day." },
  { id: "movement", icon: Heart, title: "Keep moving", description: "30 minutes of moderate activity, most days." },
  { id: "sleep", icon: Moon, title: "Sleep well", description: "7–9 hours supports recovery and immunity." },
  { id: "diet", icon: Apple, title: "Eat a balanced diet", description: "Half your plate vegetables and fruit." },
] as const;

/** Today's date from the clock, not a fixed string. */
function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** "2026-08-12 09:14:00" → "12 Aug, 09:14" */
function shortDateTime(value: string): string {
  const d = new Date(value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  return (
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Declined",
};

export default function PatientDashboardPage() {
  const { user } = useAuth();

  // The server scopes this to the signed-in patient — no id is sent.
  const { appointments, loading, error } = useAppointments({ limit: 200 });
  const { notifications, unreadCount } = useNotifications();

  const stats = useMemo(() => {
    const t = today();
    const todays = appointments.filter(
      (a) => a.date === t && a.status !== "cancelled" && a.status !== "rejected",
    );
    const upcoming = appointments.filter(
      (a) => a.date >= t && (a.status === "pending" || a.status === "confirmed"),
    );

    return {
      todays,
      upcoming,
      completed: appointments.filter((a) => a.status === "completed").length,
      total: appointments.length,
    };
  }, [appointments]);

  // "Recent activity" is the patient's own most recent bookings, newest first —
  // derived from the same rows as everything else rather than a separate feed.
  const recent = useMemo<Appointment[]>(
    () =>
      [...appointments]
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 5),
    [appointments],
  );

  const unread = notifications.filter((n) => !n.isRead);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-health p-6 text-white shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Welcome back, {user?.name?.split(" ")[0]}</h1>
            <p className="mt-1 text-white/80 text-sm">Here&apos;s your health summary for today.</p>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-full bg-white/20">
            <Activity className="h-7 w-7" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/patient/appointments" className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:shadow-elevated">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-white"><CalendarClock className="h-5 w-5" /></div>
          <div className="mt-3 text-2xl font-semibold">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : stats.todays.length}
          </div>
          <div className="text-xs text-muted-foreground">Today&apos;s appointments</div>
        </Link>
        <Link to="/patient/appointments" className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:shadow-elevated">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-health text-white"><CalendarCheck className="h-5 w-5" /></div>
          <div className="mt-3 text-2xl font-semibold">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : stats.upcoming.length}
          </div>
          <div className="text-xs text-muted-foreground">Upcoming appointments</div>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-soft text-primary"><Activity className="h-5 w-5" /></div>
          <div className="mt-3 text-2xl font-semibold">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : stats.completed}
          </div>
          <div className="text-xs text-muted-foreground">Completed visits</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-white"><Clock className="h-5 w-5" /></div>
          <div className="mt-3 text-2xl font-semibold">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : stats.total}
          </div>
          <div className="text-xs text-muted-foreground">Total appointments</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {stats.todays.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="mb-3 text-base font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Today&apos;s Appointment</h2>
              <div className="space-y-2">
                {stats.todays.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl bg-primary/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-white">
                        {initials(a.doctorName)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{a.doctorName}</div>
                        <div className="text-xs text-muted-foreground">{a.specialty} &middot; {a.time}</div>
                      </div>
                    </div>
                    <Link to={`/patient/appointments/${a.id}`} className="text-xs font-medium text-primary hover:underline">Details</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Link to="/patient/appointments/book" className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <CalendarClock className="h-6 w-6 text-primary" /> Book Appointment
              </Link>
              <Link to="/patient/ai-assistant" className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Bot className="h-6 w-6 text-primary" /> AI Assistant
              </Link>
              <Link to="/patient/documents" className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <FileText className="h-6 w-6 text-primary" /> Documents
              </Link>
              <Link to="/patient/appointments" className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Stethoscope className="h-6 w-6 text-primary" /> My Appointments
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Recent Appointments</h2>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                You have no appointments yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recent.map((a) => (
                  <Link
                    key={a.id}
                    to={`/patient/appointments/${a.id}`}
                    className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.doctorName}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.date} at {a.time} &middot; {STATUS_LABEL[a.status] ?? a.status}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {a.createdAt ? shortDateTime(a.createdAt) : ""}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Notifications
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </h2>
              <Link to="/patient/notifications" className="text-xs font-medium text-primary hover:underline">View all</Link>
            </div>
            {unread.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No new notifications</p>
            ) : (
              <div className="space-y-2">
                {unread.slice(0, 3).map((n) => (
                  <div key={n.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <span className="text-sm font-medium">{n.title}</span>
                    </div>
                    {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {shortDateTime(n.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Health Tips</h2>
            <div className="space-y-2">
              {HEALTH_TIPS.map((tip) => {
                const Icon = tip.icon;
                return (
                  <div key={tip.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-soft text-primary shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{tip.title}</div>
                      <div className="text-xs text-muted-foreground">{tip.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
