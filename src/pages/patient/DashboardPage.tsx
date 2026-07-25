import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  CalendarCheck,
  Clock,
  Activity,
  Bell,
  Stethoscope,
  Bot,
  FileText,
  Droplets,
  Heart,
  Moon,
  Apple,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { patientService } from "@/services/patient";

const tipIcons: Record<string, React.ElementType> = { Droplets, Heart, Moon, Apple };

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const upcoming = useMemo(() => patientService.getUpcomingAppointments(), []);
  const todayApps = useMemo(() => patientService.getTodaysAppointments(), []);
  const stats = useMemo(() => {
    const all = patientService.getAppointments();
    return { total: all.length, completed: all.filter((a) => a.status === "completed").length, upcoming: all.filter((a) => a.status === "upcoming").length };
  }, []);
  const tips = useMemo(() => patientService.getHealthTips(), []);
  const notifications = useMemo(() => patientService.getNotifications().filter((n) => !n.read), []);
  const recent = useMemo(() => patientService.getRecentActivity(), []);

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/patient/appointments" className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:shadow-elevated">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-white"><CalendarClock className="h-5 w-5" /></div>
          <div className="mt-3 text-2xl font-semibold">{todayApps.length}</div>
          <div className="text-xs text-muted-foreground">Today&apos;s appointments</div>
        </Link>
        <Link to="/patient/appointments" className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:shadow-elevated">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-health text-white"><CalendarCheck className="h-5 w-5" /></div>
          <div className="mt-3 text-2xl font-semibold">{upcoming.length}</div>
          <div className="text-xs text-muted-foreground">Upcoming appointments</div>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-soft text-primary"><Activity className="h-5 w-5" /></div>
          <div className="mt-3 text-2xl font-semibold">{stats.completed}</div>
          <div className="text-xs text-muted-foreground">Completed visits</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-white"><Clock className="h-5 w-5" /></div>
          <div className="mt-3 text-2xl font-semibold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total appointments</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {todayApps.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="mb-3 text-base font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Today&apos;s Appointment</h2>
              {todayApps.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-white">
                      {a.doctorName.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{a.doctorName}</div>
                      <div className="text-xs text-muted-foreground">{a.doctorSpecialty} &middot; {a.time}</div>
                    </div>
                  </div>
                  <Link to={`/patient/appointments/${a.id}`} className="text-xs font-medium text-primary hover:underline">Details</Link>
                </div>
              ))}
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
            <h2 className="mb-3 text-base font-semibold">Recent Activity</h2>
            <div className="space-y-2">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{r.action}</div>
                    <div className="text-xs text-muted-foreground">{r.detail}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notifications</h2>
              <Link to="/patient/notifications" className="text-xs font-medium text-primary hover:underline">View all</Link>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No new notifications</p>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 3).map((n) => (
                  <div key={n.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <span className="text-sm font-medium">{n.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                    <span className="mt-1 block text-[11px] text-muted-foreground">{n.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Health Tips</h2>
            <div className="space-y-2">
              {tips.map((tip) => {
                const Icon = tipIcons[tip.icon] ?? Heart;
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
