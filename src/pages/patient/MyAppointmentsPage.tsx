import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Calendar, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { patientService } from "@/services/patient";
import type { Appointment } from "@/types/patient";

type Tab = "upcoming" | "completed" | "cancelled";

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function AppointmentCard({ a }: { a: Appointment }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:bg-accent/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-white shrink-0">
            {a.doctorName.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <Link to={`/patient/appointments/${a.id}`} className="text-sm font-medium hover:text-primary">{a.doctorName}</Link>
            <div className="text-xs text-muted-foreground">{a.doctorSpecialty}</div>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors[a.status] ?? ""}`}>{a.status}</span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {a.date}</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.time}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{a.reason}</p>
      <div className="mt-3 flex items-center gap-2">
        <Link to={`/patient/appointments/${a.id}`} className="text-xs font-medium text-primary hover:underline">View details</Link>
        {a.status === "upcoming" && <>
          <span className="text-xs text-muted-foreground">|</span>
          <Link to={`/patient/appointments/${a.id}`} className="text-xs font-medium text-destructive hover:underline">Cancel</Link>
        </>}
      </div>
    </div>
  );
}

export default function MyAppointmentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [search, setSearch] = useState("");

  const appointments = useMemo(() => patientService.getAppointments(), []);

  const filtered = useMemo(() => {
    let result = appointments.filter((a) => a.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.doctorName.toLowerCase().includes(q) || a.reason.toLowerCase().includes(q));
    }
    return result;
  }, [appointments, activeTab, search]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "upcoming", label: "Upcoming", count: appointments.filter((a) => a.status === "upcoming").length },
    { key: "completed", label: "Completed", count: appointments.filter((a) => a.status === "completed").length },
    { key: "cancelled", label: "Cancelled", count: appointments.filter((a) => a.status === "cancelled").length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My Appointments</h1>
        <Link to="/patient/appointments/book" className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-white shadow-soft">
          Book New
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeTab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search appointments..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No {activeTab} appointments found.</p>
          </div>
        ) : (
          filtered.map((a) => <AppointmentCard key={a.id} a={a} />)
        )}
      </div>
    </div>
  );
}
