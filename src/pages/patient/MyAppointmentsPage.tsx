import { useMemo, useState } from "react";
import { CalendarDays, CalendarClock, Plus, XCircle, CheckCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/shared/StatCard";
import { appointmentService } from "@/services/appointments";
import { AppointmentCard, BookAppointmentModal, CancelAppointmentModal, AppointmentDetailsModal } from "@/components/appointments";
import type { Appointment } from "@/types/appointment";

const PATIENT_ID = "p1";

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState(() => appointmentService.getAppointmentsByPatient(PATIENT_ID));
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");
  const [bookOpen, setBookOpen] = useState(false);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);

  const filtered = useMemo(() => {
    let result = appointments;
    if (activeTab !== "all") result = result.filter((a) => a.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.doctorName.toLowerCase().includes(q) || a.reason.toLowerCase().includes(q) || a.specialty.toLowerCase().includes(q));
    }
    return result.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [appointments, activeTab, search]);

  const stats = appointmentService.getStatusCounts(appointments);

  const refresh = () => setAppointments(appointmentService.getAppointmentsByPatient(PATIENT_ID));

  const tabs = [
    { key: "all" as const, label: "All", count: stats.total },
    { key: "pending" as const, label: "Pending", count: stats.pending },
    { key: "confirmed" as const, label: "Confirmed", count: stats.confirmed },
    { key: "completed" as const, label: "Completed", count: stats.completed },
    { key: "cancelled" as const, label: "Cancelled", count: stats.cancelled },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My Appointments</h1>
        <Button onClick={() => setBookOpen(true)} className="rounded-xl bg-gradient-primary">
          <Plus className="mr-1 h-4 w-4" /> Book Appointment
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarClock} label="Total" value={stats.total} color="bg-gradient-primary" />
        <StatCard icon={CalendarDays} label="Upcoming" value={stats.pending + stats.confirmed} color="bg-gradient-health" />
        <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="bg-gradient-soft text-primary" />
        <StatCard icon={XCircle} label="Cancelled" value={stats.cancelled} color="bg-gradient-primary" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${activeTab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by doctor, reason, or specialty..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No appointments found.</p>
          </div>
        ) : (
          filtered.map((a) => (
            <AppointmentCard key={a.id} appointment={a} actions={
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={() => setDetailsAppt(a)}>Details</Button>
                {(a.status === "pending" || a.status === "confirmed") && (
                  <>
                    <Button variant="ghost" size="sm" className="rounded-lg text-xs text-destructive" onClick={() => setCancelAppt(a)}>Cancel</Button>
                  </>
                )}
              </div>
            } />
          ))
        )}
      </div>

      <BookAppointmentModal open={bookOpen} onClose={() => setBookOpen(false)} onBooked={refresh} />
      <CancelAppointmentModal open={!!cancelAppt} appointment={cancelAppt} onClose={() => setCancelAppt(null)}
        onConfirm={(reason) => { if (cancelAppt) { appointmentService.cancelAppointment(cancelAppt.id, reason); refresh(); } }} />
      <AppointmentDetailsModal open={!!detailsAppt} appointment={detailsAppt} onClose={() => setDetailsAppt(null)} />
    </div>
  );
}
