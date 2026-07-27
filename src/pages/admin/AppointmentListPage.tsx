import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle, Clock, Download, Filter, Loader2, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { useAppointments } from "@/hooks/useAppointments";
import { useDebounced } from "@/hooks/useDebounced";
import { appointmentService } from "@/services/appointments";
import { AppointmentDetailsModal, AppointmentTable } from "@/components/appointments";
import type { Appointment, AppointmentStats, AppointmentStatus } from "@/types/appointment";

/**
 * The admin's view of appointments is deliberately read-only: oversight and
 * statistics, not day-to-day operation. Booking, confirming and cancelling
 * belong to patients, doctors and the front desk — the API enforces this too.
 */
export default function AppointmentListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");
  const debouncedSearch = useDebounced(search, 300);

  const { appointments, loading, error, reload } = useAppointments({
    status: statusFilter,
    q: debouncedSearch,
  });

  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    appointmentService
      .stats()
      .then(setStats)
      .catch((err: unknown) =>
        setStatsError(err instanceof Error ? err.message : "Could not load statistics."),
      );
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">All Appointments</h1>
        <Button
          variant="outline"
          className="rounded-xl"
          disabled={appointments.length === 0}
          onClick={() => exportCsv(appointments)}
        >
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}

      {/* Clinic-wide totals, not a count of whatever the filter happens to show. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Total" value={stats?.total ?? 0} color="bg-gradient-primary" />
        <StatCard icon={Clock} label="Pending" value={stats?.byStatus.pending ?? 0} color="bg-gradient-health" />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={stats?.byStatus.completed ?? 0}
          color="bg-gradient-soft text-primary"
        />
        <StatCard icon={XCircle} label="Cancelled" value={stats?.byStatus.cancelled ?? 0} color="bg-gradient-primary" />
      </div>

      {statsError ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-soft">
          <AlertCircle className="h-4 w-4" /> {statsError}
        </div>
      ) : (
        stats && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border bg-card shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">At a glance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Metric label="Today" value={stats.today} />
                <Metric label="Next 7 days" value={stats.next7Days} />
                <Metric label="Cancellation rate" value={`${stats.cancellationRate}%`} />
                <Metric label="Declined or cancelled" value={`${stats.noShowRate}%`} />
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-soft lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Busiest doctors</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.perDoctor.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No appointments recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {stats.perDoctor.slice(0, 5).map((d) => (
                      <div key={d.doctorId} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{d.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{d.specialty}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                          <span>{d.completed} done</span>
                          <span>{d.cancelled} cancelled</span>
                          <span className="font-semibold text-foreground">{d.total} total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patient, doctor, or reason…"
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AppointmentStatus | "all")}>
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
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

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground shadow-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading appointments…
        </div>
      ) : (
        // No `actions` prop: the menu offers "View Details" and nothing else.
        <AppointmentTable appointments={appointments} onAction={(_, appt) => setDetailsAppt(appt)} />
      )}

      <AppointmentDetailsModal open={!!detailsAppt} appointment={detailsAppt} onClose={() => setDetailsAppt(null)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function exportCsv(appointments: Appointment[]): void {
  const headers = ["ID", "Patient", "Doctor", "Specialty", "Date", "Start", "End", "Status", "Type", "Reason"];

  const rows = appointments.map((a) =>
    [
      a.id,
      a.patientName,
      a.doctorName,
      a.specialty,
      a.date,
      a.time,
      a.endTime,
      a.status,
      a.type,
      a.reason,
    ].map(csvCell),
  );

  const csv = [headers.map(csvCell), ...rows].map((row) => row.join(",")).join("\r\n");

  // The BOM is what makes Excel read this as UTF-8 rather than the local
  // codepage, which otherwise mangles accented patient names.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `appointments-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Quote every cell and double any embedded quotes. A reason such as
 * `Chest pain, worse at night` would otherwise split into two columns.
 */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}
