import { useMemo, useState } from "react";
import { AlertCircle, CalendarClock, CalendarDays, CheckCircle, Loader2, Plus, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/shared/StatCard";
import { useAppointments } from "@/hooks/useAppointments";
import { canCancel, canReschedule } from "@/services/appointments";
import {
  AppointmentCard,
  AppointmentDetailsModal,
  BookAppointmentModal,
  CancelAppointmentModal,
  RescheduleAppointmentModal,
} from "@/components/appointments";
import type { Appointment, AppointmentStatus } from "@/types/appointment";

type Tab = AppointmentStatus | "all";

export default function MyAppointmentsPage() {
  // No patient id anywhere: the API scopes the list to the signed-in user, so
  // this page cannot accidentally show — or act on — someone else's bookings.
  const { appointments, counts, loading, error, reload, busyId, actionError, dismissActionError, cancel, reschedule } =
    useAppointments();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [bookOpen, setBookOpen] = useState(false);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return appointments
      .filter((a) => (tab === "all" ? true : a.status === tab))
      .filter((a) =>
        query === ""
          ? true
          : a.doctorName.toLowerCase().includes(query) ||
            a.reason.toLowerCase().includes(query) ||
            a.specialty.toLowerCase().includes(query),
      );
  }, [appointments, tab, search]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.total },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "confirmed", label: "Confirmed", count: counts.confirmed },
    { key: "completed", label: "Completed", count: counts.completed },
    { key: "cancelled", label: "Cancelled", count: counts.cancelled },
    { key: "rejected", label: "Rejected", count: counts.rejected },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My Appointments</h1>
        <Button onClick={() => setBookOpen(true)} className="rounded-xl bg-gradient-primary">
          <Plus className="mr-1 h-4 w-4" /> Book Appointment
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

      {/* Errors from a row action that has no dialog of its own. */}
      {actionError && !cancelAppt && !rescheduleAppt && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {actionError}
          </span>
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={dismissActionError}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarClock} label="Total" value={counts.total} color="bg-gradient-primary" />
        <StatCard
          icon={CalendarDays}
          label="Upcoming"
          value={counts.pending + counts.confirmed}
          color="bg-gradient-health"
        />
        <StatCard icon={CheckCircle} label="Completed" value={counts.completed} color="bg-gradient-soft text-primary" />
        <StatCard icon={XCircle} label="Cancelled" value={counts.cancelled} color="bg-gradient-primary" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by doctor, reason, or specialty…"
          className="h-10 rounded-xl pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground shadow-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your appointments…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              {appointments.length === 0 ? "You have no appointments yet." : "No appointments match this filter."}
            </p>
            {appointments.length === 0 && (
              <Button onClick={() => setBookOpen(true)} className="mt-4 rounded-xl">
                <Plus className="mr-1 h-4 w-4" /> Book your first appointment
              </Button>
            )}
          </div>
        ) : (
          filtered.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              headline="doctor"
              actions={
                <div className="flex items-center gap-1">
                  {busyId === a.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={() => setDetailsAppt(a)}>
                    Details
                  </Button>
                  {canReschedule(a, false) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-xs"
                      disabled={busyId === a.id}
                      onClick={() => {
                        dismissActionError();
                        setRescheduleAppt(a);
                      }}
                    >
                      Reschedule
                    </Button>
                  )}
                  {canCancel(a, false) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-xs text-destructive"
                      disabled={busyId === a.id}
                      onClick={() => {
                        dismissActionError();
                        setCancelAppt(a);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              }
            />
          ))
        )}
      </div>

      <BookAppointmentModal open={bookOpen} onClose={() => setBookOpen(false)} onBooked={() => void reload()} />

      <CancelAppointmentModal
        open={!!cancelAppt}
        appointment={cancelAppt}
        error={actionError}
        onClose={() => {
          setCancelAppt(null);
          dismissActionError();
        }}
        onConfirm={(reason) => (cancelAppt ? cancel(cancelAppt.id, reason) : Promise.resolve(false))}
      />

      <RescheduleAppointmentModal
        open={!!rescheduleAppt}
        appointment={rescheduleAppt}
        error={actionError}
        onClose={() => {
          setRescheduleAppt(null);
          dismissActionError();
        }}
        onConfirm={(date, time) =>
          rescheduleAppt ? reschedule(rescheduleAppt.id, date, time) : Promise.resolve(false)
        }
      />

      <AppointmentDetailsModal open={!!detailsAppt} appointment={detailsAppt} onClose={() => setDetailsAppt(null)} />
    </div>
  );
}
