import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { doctorService } from "@/services/doctor";

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

export default function TodaysAppointmentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const appointments = useMemo(() => doctorService.getTodaysAppointments(), []);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const matchesSearch = a.patientName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s Appointments</h1>
        <p className="mt-1 text-sm text-muted-foreground">{appointments.length} appointments scheduled for today</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search patients..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <p className="text-sm text-muted-foreground">No appointments match your filters.</p>
          </div>
        ) : (
          filtered.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:bg-accent/30">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {a.patientName.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <Link to={`/doctor/patients/${a.patientId}`} className="text-sm font-medium hover:text-primary">{a.patientName}</Link>
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
              <p className="mt-2 text-xs text-muted-foreground">{a.reason}</p>
              {a.notes && <p className="mt-1 text-xs text-muted-foreground italic">Note: {a.notes}</p>}
              <div className="mt-3 flex items-center gap-2">
                <Link to={`/doctor/patients/${a.patientId}`} className="text-xs font-medium text-primary hover:underline">View patient</Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
