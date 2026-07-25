import { useMemo, useState } from "react";
import { CalendarDays, Search, Filter, Download, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { appointmentService } from "@/services/appointments";
import { AppointmentStatusBadge, AppointmentDetailsModal } from "@/components/appointments";
import type { Appointment } from "@/types/appointment";

export default function AppointmentListPage() {
  const [appointments] = useState(() => appointmentService.getAppointments());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);

  const filtered = useMemo(() => {
    let result = appointments;
    if (statusFilter !== "all") result = result.filter((a) => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.patientName.toLowerCase().includes(q) || a.doctorName.toLowerCase().includes(q) || a.specialty.toLowerCase().includes(q) || a.reason.toLowerCase().includes(q));
    }
    return result.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [appointments, statusFilter, search]);

  const stats = appointmentService.getStatusCounts(appointments);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">All Appointments</h1>
        <Button variant="outline" className="rounded-xl" onClick={() => alert("Export feature coming soon!")}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Total" value={stats.total} color="bg-gradient-primary" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="bg-gradient-health" />
        <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="bg-gradient-soft text-primary" />
        <StatCard icon={XCircle} label="Cancelled" value={stats.cancelled} color="bg-gradient-primary" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search patient, doctor, specialty, or reason..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-40"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No appointments found.</p>
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
                    <p className="text-xs text-muted-foreground">{a.doctorName || "Unassigned"} · {a.specialty} · {a.date} {a.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AppointmentStatusBadge status={a.status} />
                  <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={() => setDetailsAppt(a)}>Details</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AppointmentDetailsModal open={!!detailsAppt} appointment={detailsAppt} onClose={() => setDetailsAppt(null)} />
    </div>
  );
}
