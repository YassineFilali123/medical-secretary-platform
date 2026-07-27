import { useState } from "react";
import { AlertCircle, CalendarDays, Clock, Filter, Loader2, Plus, Search, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/shared/StatCard";
import { useAppointments } from "@/hooks/useAppointments";
import { useDebounced } from "@/hooks/useDebounced";
import {
  AppointmentDetailsModal,
  AppointmentTable,
  BookAppointmentModal,
  CancelAppointmentModal,
  RescheduleAppointmentModal,
  type AppointmentAction,
} from "@/components/appointments";
import type { Appointment, AppointmentStatus } from "@/types/appointment";

/** What a secretary may do: book, move, cancel, and settle a time by confirming. */
const SECRETARY_ACTIONS: AppointmentAction[] = ["confirm", "reschedule", "cancel"];

export default function AppointmentManagementPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");

  // Searching server-side keeps the page honest when the clinic has more
  // appointments than one response can carry.
  const debouncedSearch = useDebounced(search, 300);

  const {
    appointments,
    counts,
    loading,
    error,
    reload,
    busyId,
    actionError,
    dismissActionError,
    cancel,
    reschedule,
    confirm,
  } = useAppointments({ status: statusFilter, q: debouncedSearch });

  const [bookOpen, setBookOpen] = useState(false);
  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);

  const handleAction = (action: AppointmentAction, appointment: Appointment) => {
    dismissActionError();
    switch (action) {
      case "details":
        setDetailsAppt(appointment);
        break;
      case "confirm":
        void confirm(appointment.id);
        break;
      case "reschedule":
        setRescheduleAppt(appointment);
        break;
      case "cancel":
        setCancelAppt(appointment);
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Appointment Management</h1>
        <Button onClick={() => setBookOpen(true)} className="rounded-xl bg-gradient-primary">
          <Plus className="mr-1 h-4 w-4" /> New Appointment
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
        <StatCard icon={CalendarDays} label="Total" value={counts.total} color="bg-gradient-primary" />
        <StatCard icon={Clock} label="Pending" value={counts.pending} color="bg-gradient-health" />
        <StatCard icon={UserCheck} label="Confirmed" value={counts.confirmed} color="bg-gradient-soft text-primary" />
        <StatCard icon={CalendarDays} label="Completed" value={counts.completed} color="bg-gradient-primary" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patient, doctor, or reason…"
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading && search !== debouncedSearch && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
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
        <div className={busyId !== null ? "pointer-events-none opacity-60" : undefined}>
          <AppointmentTable appointments={appointments} onAction={handleAction} actions={SECRETARY_ACTIONS} />
        </div>
      )}

      <BookAppointmentModal
        mode="secretary"
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        onBooked={() => void reload()}
      />

      <AppointmentDetailsModal open={!!detailsAppt} appointment={detailsAppt} onClose={() => setDetailsAppt(null)} />

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
    </div>
  );
}
