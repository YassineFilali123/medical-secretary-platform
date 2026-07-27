import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppointments } from "@/hooks/useAppointments";
import { AppointmentStatusBadge } from "@/components/appointments";
import { TYPE_LABELS, type Appointment, type AppointmentStatus } from "@/types/appointment";

/**
 * The doctor's week at a glance. Read-only by design — accepting, rejecting and
 * completing all live on the Appointments page, so there is one place where the
 * lifecycle is driven and no chance of the two disagreeing.
 */
export default function SchedulePage() {
  const [anchor, setAnchor] = useState(new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const from = format(weekStart, "yyyy-MM-dd");
  const to = format(addDays(weekStart, 6), "yyyy-MM-dd");

  // Scoped to the signed-in doctor by the API; this only picks the week.
  const { appointments, loading, error, reload } = useAppointments({ from, to, limit: 500 });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return appointments.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (query === "") return true;
      return a.patientName.toLowerCase().includes(query) || a.reason.toLowerCase().includes(query);
    });
  }, [appointments, search, statusFilter]);

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of filtered) {
      const list = map.get(a.date);
      if (list) list.push(a);
      else map.set(a.date, [a]);
    }
    for (const list of map.values()) {
      list.sort((x, y) => x.time.localeCompare(y.time));
    }
    return map;
  }, [filtered]);

  const ordered = useMemo(
    () => [...filtered].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [filtered],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">My Schedule</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchor((d) => addDays(d, -7))}
            aria-label="Previous week"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[170px] text-center text-sm font-medium">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <button
            onClick={() => setAnchor((d) => addDays(d, 7))}
            aria-label="Next week"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
        </div>
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient or reason…"
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AppointmentStatus | "all")}>
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-44">
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

      <div className="grid gap-3 lg:grid-cols-7">
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayAppointments = byDay.get(dateStr) ?? [];
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dateStr}
              className={`rounded-xl border border-border p-3 ${isToday ? "ring-2 ring-primary/20" : ""}`}
            >
              <div className={`mb-2 text-center text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                <div>{format(day, "EEE")}</div>
                <div className={`mt-0.5 text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                  {format(day, "d")}
                </div>
              </div>
              <div className="space-y-1.5">
                {dayAppointments.map((a) => (
                  <Link
                    key={a.id}
                    to={`/doctor/patients/${a.patientId}`}
                    className="block rounded-lg border border-border/50 bg-background p-2 text-xs transition-colors hover:bg-accent/50"
                  >
                    <div className="truncate font-medium">{a.patientName}</div>
                    <div className="text-muted-foreground">{a.time}</div>
                  </Link>
                ))}
                {dayAppointments.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <h2 className="text-base font-semibold">This week ({ordered.length})</h2>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground shadow-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule…
          </div>
        ) : ordered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              {appointments.length === 0 ? "Nothing booked this week." : "No appointments match your filters."}
            </p>
          </div>
        ) : (
          ordered.map((a) => (
            <Link
              key={a.id}
              to={`/doctor/patients/${a.patientId}`}
              className="block rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {a.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.patientName}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {format(new Date(`${a.date}T00:00:00`), "EEE d MMM")} ·{" "}
                      {a.time}–{a.endTime}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {TYPE_LABELS[a.type]}
                  </span>
                  <AppointmentStatusBadge status={a.status} />
                </div>
              </div>
              <p className="mt-2 pl-12 text-xs text-muted-foreground">{a.reason}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
