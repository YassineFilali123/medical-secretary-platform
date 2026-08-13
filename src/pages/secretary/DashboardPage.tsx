import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  TimerReset,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppointments } from "@/hooks/useAppointments";
import { StatCard } from "@/components/shared/StatCard";
import {
  useMyActiveChatsQuery,
  useWaitingChatsQuery,
} from "@/hooks/queries/useLiveChatQueries";
import { useDocumentRequestsQuery } from "@/hooks/queries/useDocumentQueries";

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function relativeTime(value: string | null | undefined): string {
  if (!value) return "";
  const then = new Date(value.replace(" ", "T")).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor(Math.max(0, Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export default function SecretaryDashboardPage() {
  const { user } = useAuth();
  const todayStr = useMemo(() => ymd(new Date()), []);

  // Clinic-wide appointments for today — the server scopes by role.
  const { appointments, loading } = useAppointments({
    from: todayStr,
    to: todayStr,
    limit: 200,
  });

  // Both live-chat lists poll on their own schedule via React Query.
  const waitingQuery = useWaitingChatsQuery();
  const activeQuery = useMyActiveChatsQuery();
  const documentsQuery = useDocumentRequestsQuery("pending");

  const waiting = waitingQuery.data ?? null;
  const active = activeQuery.data ?? null;
  const documents = documentsQuery.data?.requests ?? null;
  const error =
    waitingQuery.error || activeQuery.error ? "Could not load live chat data." : null;

  const todaysAppointments = useMemo(
    () => appointments.filter((a) => a.status !== "cancelled" && a.status !== "rejected"),
    [appointments],
  );
  const pendingAppointments = useMemo(
    () => appointments.filter((a) => a.status === "pending"),
    [appointments],
  );

  const show = (v: number | null | undefined) =>
    v === null || v === undefined ? "…" : v;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user?.name?.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s your front desk overview.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MessageSquare}
          label="Active Conversations"
          value={show(active?.length)}
          sub="Assigned to you"
          color="bg-gradient-primary"
        />
        <StatCard
          icon={Clock}
          label="Waiting Patients"
          value={show(waiting?.length)}
          sub="Live chat queue"
          color="bg-gradient-health"
        />
        <StatCard
          icon={CalendarClock}
          label="Today's Appointments"
          value={loading ? "…" : todaysAppointments.length}
          sub={loading ? undefined : `${pendingAppointments.length} pending`}
          color="bg-gradient-soft text-primary"
        />
        <StatCard
          icon={FileText}
          label="Document Requests"
          value={show(documents?.length)}
          sub="Awaiting processing"
          color="bg-gradient-primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Patients queueing for a secretary, straight from live_chat. */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Waiting for a secretary</h2>
              <Link to="/secretary/live-chat" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Open live chat <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {waiting === null ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : waiting.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nobody is waiting right now.</p>
            ) : (
              <div className="space-y-2">
                {waiting.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    to="/secretary/live-chat"
                    className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 hover:bg-amber-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-amber-500" />
                      <div>
                        <div className="text-sm font-medium">{c.patientName ?? "Patient"}</div>
                        <div className="text-xs text-muted-foreground">
                          Waiting since {relativeTime(c.createdAt)}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      waiting
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Today's clinic schedule. */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Today&apos;s Appointments</h2>
              <Link to="/secretary/appointments" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Manage <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : todaysAppointments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No appointments today.</p>
            ) : (
              <div className="space-y-2">
                {todaysAppointments.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.patientName}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.time} &middot; {a.doctorName}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Your Active Conversations</h2>
            </div>
            {active === null ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : active.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">You have no active conversations.</p>
            ) : (
              <div className="space-y-2">
                {active.slice(0, 3).map((c) => (
                  <Link
                    key={c.id}
                    to={`/secretary/live-chat?chatId=${c.id}`}
                    className="block rounded-xl border border-border p-3 hover:bg-accent/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate text-sm font-medium">{c.patientName ?? "Patient"}</span>
                        {(c.unreadCount ?? 0) > 0 && (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {relativeTime(c.lastMessageAt)}
                      </span>
                    </div>
                    {c.lastMessage && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{c.lastMessage}</p>
                    )}
                  </Link>
                ))}
                <Link to="/secretary/active-conversations" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  View all conversations <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/secretary/live-chat" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <MessageSquare className="h-5 w-5" /> Live Chat
              </Link>
              <Link to="/secretary/appointments" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <CalendarClock className="h-5 w-5" /> Appointments
              </Link>
              <Link to="/secretary/document-requests" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <FileText className="h-5 w-5" /> Documents
              </Link>
              <Link to="/secretary/schedule-adjustments" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <TimerReset className="h-5 w-5" /> Adjustments
              </Link>
              <Link to="/secretary/followups" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Users className="h-5 w-5" /> Follow-ups
              </Link>
              <Link to="/secretary/calendar" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <CalendarClock className="h-5 w-5" /> Calendar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
