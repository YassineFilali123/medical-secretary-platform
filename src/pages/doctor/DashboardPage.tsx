import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Clock,
  Users,
  Brain,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { doctorService } from "@/services/doctor";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/shared/StatCard";
import type { DoctorAppointment, WeeklyStat } from "@/types/doctor";

function AppointmentCard({ a }: { a: DoctorAppointment }) {
  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    "in-progress": "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {a.patientName.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <div className="text-sm font-medium">{a.patientName}</div>
          <div className="text-xs text-muted-foreground">
            {a.time} &middot; {a.duration}min
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors[a.status] ?? ""}`}>
          {a.status}
        </span>
      </div>
    </div>
  );
}

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [stats, setStats] = useState<WeeklyStat[]>([]);

  useEffect(() => {
    setAppointments(doctorService.getTodaysAppointments());
    setStats(doctorService.getWeeklyStats());
  }, []);

  const totalThisWeek = stats.reduce((s, d) => s + d.appointments, 0);
  const completedThisWeek = stats.reduce((s, d) => s + d.completed, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user?.name?.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s your practice overview for today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarClock} label="Today's Appointments" value={appointments.length} color="bg-gradient-primary" />
        <StatCard icon={Clock} label="Available Hours" value={`${8 - appointments.length * 0.5}h`} sub="Remaining today" color="bg-gradient-health" />
        <StatCard icon={Users} label="Total Patients" value="48" sub="Active patients" color="bg-gradient-soft text-primary" />
        <StatCard icon={Brain} label="AI Conversations" value="12" sub="This week" color="bg-gradient-primary" />
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
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No appointments scheduled for today.</p>
            ) : (
              <div className="space-y-2">
                {appointments.map((a) => <AppointmentCard key={a.id} a={a} />)}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-4 text-base font-semibold">Weekly Statistics</h2>
            <div className="flex items-end gap-2 h-32">
              {stats.map((d) => {
                const maxVal = Math.max(...stats.map((s) => s.appointments), 1);
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
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" /> Urgent
            </h2>
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-sm font-medium">Patient John Doe</p>
              <p className="text-xs text-muted-foreground mt-1">Reported chest pain. ECG needed.</p>
              <Link to="/doctor/patients/p1" className="mt-2 inline-flex text-xs font-medium text-primary hover:underline">View patient</Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">AI Summary</h2>
            <div className="space-y-2">
              <div className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Brain className="h-4 w-4 text-primary" /> Emma Wilson
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Discussed palpitation triggers. Patient doing well.</p>
              </div>
              <Link to="/doctor/ai-conversations" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                View all conversations <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

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
                <Brain className="h-5 w-5" /> AI Chat
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
