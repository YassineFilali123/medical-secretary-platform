import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Brain,
  CalendarClock,
  CheckCircle,
  Clock,
  Loader2,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppointments } from "@/hooks/useAppointments";
import { StatCard } from "@/components/shared/StatCard";
import { doctorPatientService } from "@/services/patients";
import { doctorConversationService, type DoctorAiConversation } from "@/services/doctor-conversations";
import { followUpService, type FollowUpRecommendation } from "@/services/followup";
import type { Appointment } from "@/types/appointment";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  rejected: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday of the current week, from the clock. */
function weekStart(): Date {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function AppointmentCard({ a }: { a: Appointment }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials(a.patientName)}
        </div>
        <div>
          <div className="text-sm font-medium">{a.patientName}</div>
          <div className="text-xs text-muted-foreground">
            {a.time} &middot; {a.duration}min
          </div>
        </div>
      </div>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_COLORS[a.status] ?? ""}`}>
        {a.status}
      </span>
    </div>
  );
}

export default function DoctorDashboardPage() {
  const { user } = useAuth();

  const monday = useMemo(() => weekStart(), []);
  const sunday = useMemo(() => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    return d;
  }, [monday]);
  const todayStr = useMemo(() => ymd(new Date()), []);

  // One request covers today's list and the weekly chart — both are slices of
  // the same week. Scope is the server's job; no doctor id is sent.
  const { appointments, loading, error } = useAppointments({
    from: ymd(monday),
    to: ymd(sunday),
    limit: 500,
  });

  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [conversations, setConversations] = useState<DoctorAiConversation[] | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpRecommendation[]>([]);

  useEffect(() => {
    let cancelled = false;

    doctorPatientService
      .list()
      .then((list) => !cancelled && setPatientCount(list.length))
      .catch(() => !cancelled && setPatientCount(0));

    doctorConversationService
      .list()
      .then((list) => !cancelled && setConversations(list))
      .catch(() => !cancelled && setConversations([]));

    followUpService
      .doctorList()
      .then((res) => !cancelled && setFollowUps(res.followUps.slice(0, 5)))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const todays = useMemo(
    () => appointments.filter((a) => a.date === todayStr && a.status !== "cancelled" && a.status !== "rejected"),
    [appointments, todayStr],
  );

  const pending = useMemo(
    () => appointments.filter((a) => a.status === "pending"),
    [appointments],
  );

  const weekly = useMemo(() => {
    return DAY_LABELS.map((label, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const key = ymd(d);
      const dayAppointments = appointments.filter((a) => a.date === key);
      return {
        day: label,
        appointments: dayAppointments.length,
        completed: dayAppointments.filter((a) => a.status === "completed").length,
      };
    });
  }, [appointments, monday]);

  const totalThisWeek = weekly.reduce((s, d) => s + d.appointments, 0);
  const completedThisWeek = weekly.reduce((s, d) => s + d.completed, 0);

  // Conversations started within the current week.
  const conversationsThisWeek = useMemo(() => {
    if (conversations === null) return null;
    const from = ymd(monday);
    const to = ymd(sunday);
    return conversations.filter((c) => c.date >= from && c.date <= to).length;
  }, [conversations, monday, sunday]);

  const latestConversation = conversations?.[0] ?? null;
  const num = (v: number | null) => (v === null ? "—" : v);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user?.name?.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s your practice overview for today.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarClock} label="Today's Appointments" value={loading ? "…" : todays.length} color="bg-gradient-primary" />
        <StatCard icon={Clock} label="Pending Requests" value={loading ? "…" : pending.length} sub="Awaiting your decision" color="bg-gradient-health" />
        <StatCard icon={Users} label="Total Patients" value={num(patientCount)} sub="Under your care" color="bg-gradient-soft text-primary" />
        <StatCard icon={Brain} label="AI Conversations" value={num(conversationsThisWeek)} sub="This week" color="bg-gradient-primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Today&apos;s Schedule</h2>
              <Link to="/doctor/schedule" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : todays.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No appointments scheduled for today.</p>
            ) : (
              <div className="space-y-2">
                {todays.map((a) => <AppointmentCard key={a.id} a={a} />)}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-4 text-base font-semibold">This Week</h2>
            <div className="flex items-end gap-2 h-32">
              {weekly.map((d) => {
                const maxVal = Math.max(...weekly.map((s) => s.appointments), 1);
                const height = (d.appointments / maxVal) * 100;
                return (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[11px] text-muted-foreground">{d.appointments}</span>
                    <div className="w-full rounded-md bg-primary/10" style={{ height: `${Math.max(height, 4)}%` }}>
                      <div className="w-full rounded-md bg-gradient-primary transition-all" style={{ height: `${(d.completed / Math.max(d.appointments, 1)) * 100}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{d.day}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
              <span>{totalThisWeek} total appointments</span>
              <span>{completedThisWeek} completed</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Appointment requests waiting on this doctor. Replaces a card that
              used to hard-code a fictional urgent patient. */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" /> Needs your attention
            </h2>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : pending.length === 0 ? (
              <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" /> Nothing pending this week.
              </p>
            ) : (
              <div className="space-y-2">
                {pending.slice(0, 3).map((a) => (
                  <div key={a.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-sm font-medium">{a.patientName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.date} at {a.time}
                      {a.reason ? ` · ${a.reason}` : ""}
                    </p>
                  </div>
                ))}
                <Link to="/doctor/today" className="inline-flex text-xs font-medium text-primary hover:underline">
                  Review requests
                </Link>
              </div>
            )}
          </div>

          {/* Most recent AI conversation from this doctor's own patients. */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Latest AI Conversation</h2>
            {conversations === null ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : latestConversation === null ? (
              <p className="py-2 text-sm text-muted-foreground">No conversations from your patients yet.</p>
            ) : (
              <div className="space-y-2">
                <Link
                  to={`/doctor/ai-conversations/${latestConversation.id}`}
                  className="block rounded-xl border border-border bg-background p-3 hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Bot className="h-4 w-4 text-primary" /> {latestConversation.patientName}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {latestConversation.lastMessage}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {latestConversation.date} &middot; {latestConversation.messageCount} messages
                  </p>
                </Link>
                <Link to="/doctor/ai-conversations" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                  View all conversations <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {followUps.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="mb-3 text-base font-semibold">Recent Follow-ups</h2>
              <div className="space-y-2">
                {followUps.map((f) => (
                  <div key={f.id} className="rounded-xl border border-border p-3">
                    <p className="text-sm font-medium">{f.patientName ?? "Patient"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {f.periodLabel ?? f.type}
                      {f.note ? ` · ${f.note}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/doctor/schedule" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <CalendarClock className="h-5 w-5" /> Schedule
              </Link>
              <Link to="/doctor/patients" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Users className="h-5 w-5" /> Patients
              </Link>
              <Link to="/doctor/availability" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Clock className="h-5 w-5" /> Availability
              </Link>
              <Link to="/doctor/ai-conversations" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Brain className="h-5 w-5" /> AI Conversations
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
