import { useState, useMemo } from "react";
import { Search, Calendar, Clock, CheckCircle, XCircle, RotateCcw, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { secretaryService } from "@/services/secretary";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-gray-100 text-gray-600",
};

export default function AppointmentManagementPage() {
  const [appointments, setAppointments] = useState(() => secretaryService.getAppointments());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const matchesSearch = a.patientName.toLowerCase().includes(search.toLowerCase()) || a.doctorName.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || a.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [appointments, search, filter]);

  const handleConfirm = (id: string) => {
    secretaryService.confirmAppointment(id);
    setAppointments(secretaryService.getAppointments());
  };

  const handleCancel = (id: string) => {
    secretaryService.cancelAppointment(id);
    setAppointments(secretaryService.getAppointments());
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Appointment Management</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search patients or doctors..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {a.patientName.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-medium">{a.patientName}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {a.date}
                    <Clock className="h-3 w-3 ml-1" /> {a.time} ({a.duration}min)
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.doctorName} &middot; {a.reason}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors[a.status]}`}>{a.status}</span>
                {a.status === "scheduled" && (
                  <>
                    <button onClick={() => handleConfirm(a.id)} className="rounded-lg p-1.5 text-green-600 hover:bg-green-50" title="Confirm">
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleCancel(a.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Cancel">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </>
                )}
                {a.status === "confirmed" && (
                  <>
                    <button className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50" title="Reschedule">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50" title="Assign Doctor">
                      <UserCheck className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No appointments match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
