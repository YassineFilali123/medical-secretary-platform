import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle, Clock, XCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { appointmentService } from "@/services/appointments";
import { AppointmentStatusBadge, AppointmentDetailsModal, CancelAppointmentModal } from "@/components/appointments";
import type { Appointment } from "@/types/appointment";
import { format } from "date-fns";

const DOCTOR_ID = "d1";

export default function TodaysAppointmentsPage() {
  const [appointments, setAppointments] = useState(() => {
    const all = appointmentService.getAppointmentsByDoctor(DOCTOR_ID);
    const today = format(new Date(), "yyyy-MM-dd");
    return all.filter((a) => a.date === today);
  });
  const [search, setSearch] = useState("");
  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);

  const filtered = useMemo(() => {
    let result = appointments;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.patientName.toLowerCase().includes(q) || a.reason.toLowerCase().includes(q));
    }
    return result.sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, search]);

  const stats = appointmentService.getStatusCounts(appointments);

  const refresh = () => {
    const all = appointmentService.getAppointmentsByDoctor(DOCTOR_ID);
    const today = format(new Date(), "yyyy-MM-dd");
    setAppointments(all.filter((a) => a.date === today));
  };

  const handleAction = (appt: Appointment, action: "confirmed" | "completed") => {
    if (action === "confirmed") appointmentService.confirmAppointment(appt.id);
    else appointmentService.markCompleted(appt.id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today's Appointments</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Total" value={stats.total} color="bg-gradient-primary" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="bg-gradient-health" />
        <StatCard icon={CheckCircle} label="Confirmed" value={stats.confirmed} color="bg-gradient-soft text-primary" />
        <StatCard icon={XCircle} label="Completed" value={stats.completed} color="bg-gradient-primary" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by patient or reason..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No appointments for today.</p>
          </div>
        ) : (
          filtered.map((a) => (
            <Card key={a.id} className="border-border bg-card shadow-soft">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
                    {a.patientName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{a.patientName}</p>
                    <p className="text-xs text-muted-foreground">{a.time} · {a.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AppointmentStatusBadge status={a.status} />
                  <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={() => setDetailsAppt(a)}>Details</Button>
                  {a.status === "pending" && (
                    <Button size="sm" className="rounded-lg bg-gradient-health text-xs" onClick={() => handleAction(a, "confirmed")}>Confirm</Button>
                  )}
                  {a.status === "confirmed" && (
                    <Button size="sm" className="rounded-lg bg-gradient-primary text-xs" onClick={() => handleAction(a, "completed")}>Complete</Button>
                  )}
                  {(a.status === "pending" || a.status === "confirmed") && (
                    <Button variant="ghost" size="sm" className="rounded-lg text-xs text-destructive" onClick={() => setCancelAppt(a)}>Cancel</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AppointmentDetailsModal open={!!detailsAppt} appointment={detailsAppt} onClose={() => setDetailsAppt(null)} />
      <CancelAppointmentModal open={!!cancelAppt} appointment={cancelAppt} onClose={() => setCancelAppt(null)}
        onConfirm={(reason) => { if (cancelAppt) { appointmentService.cancelAppointment(cancelAppt.id, reason); refresh(); } }} />
    </div>
  );
}
