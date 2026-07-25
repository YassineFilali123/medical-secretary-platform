import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { doctorService } from "@/services/doctor";
import type { DoctorAppointment } from "@/types/doctor";
import { addDays, startOfWeek, format, isSameDay } from "date-fns";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  "in-progress": "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const typeColors: Record<string, string> = {
  consultation: "bg-purple-100 text-purple-700",
  "follow-up": "bg-teal-100 text-teal-700",
  emergency: "bg-red-100 text-red-700",
  checkup: "bg-sky-100 text-sky-700",
};

function AppointmentCard({ a }: { a: DoctorAppointment }) {
  return (
    <Link to={`/doctor/patients/${a.patientId}`} className="block rounded-xl border border-border p-3 transition-colors hover:bg-accent/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {a.patientName.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <div className="text-sm font-medium">{a.patientName}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {a.time} &middot; {a.duration}min
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${typeColors[a.type] ?? ""}`}>{a.type}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors[a.status] ?? ""}`}>{a.status}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground pl-12">{a.reason}</p>
    </Link>
  );
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const allAppointments = doctorService.getAllAppointments();

  const filtered = useMemo(() => {
    return allAppointments.filter((a) => {
      const matchesSearch = a.patientName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allAppointments, search, statusFilter]);

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return filtered.filter((a) => a.date === dateStr);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My Schedule</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate((d) => addDays(d, -7))} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[160px] text-center">
            {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <button onClick={() => setCurrentDate((d) => addDays(d, 7))} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        {weekDays.map((day) => {
          const dayApps = getAppointmentsForDay(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className={`rounded-xl border border-border p-3 ${isToday ? "ring-2 ring-primary/20" : ""}`}>
              <div className={`mb-2 text-center text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                <div>{format(day, "EEE")}</div>
                <div className={`mt-0.5 text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</div>
              </div>
              <div className="space-y-1.5">
                {dayApps.map((a) => (
                  <Link key={a.id} to={`/doctor/patients/${a.patientId}`} className="block rounded-lg border border-border/50 bg-background p-2 text-xs hover:bg-accent/50 transition-colors">
                    <div className="font-medium truncate">{a.patientName.split(" ")[0]}</div>
                    <div className="text-muted-foreground">{a.time}</div>
                  </Link>
                ))}
                {dayApps.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No appointments</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <h2 className="text-base font-semibold">All Appointments ({filtered.length})</h2>
        {filtered.map((a) => <AppointmentCard key={a.id} a={a} />)}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No appointments match your filters.</p>}
      </div>
    </div>
  );
}
