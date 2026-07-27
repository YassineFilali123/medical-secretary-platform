import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { AlertCircle, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppointments } from "@/hooks/useAppointments";
import { AppointmentStatusBadge } from "@/components/appointments";
import { TYPE_LABELS, type Appointment } from "@/types/appointment";

/** Statuses that still occupy the doctor's time, for the day dots. */
const LIVE = new Set(["pending", "confirmed", "completed"]);

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  // The grid shows trailing days of the previous month and leading days of the
  // next, so fetch the whole visible range — otherwise those cells look empty
  // when they are not.
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });

  const days = useMemo(() => {
    const out: Date[] = [];
    for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) out.push(day);
    return out;
  }, [gridStart, gridEnd]);

  const { appointments, loading, error, reload } = useAppointments({
    from: format(gridStart, "yyyy-MM-dd"),
    to: format(gridEnd, "yyyy-MM-dd"),
    limit: 500,
  });

  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const list = map.get(a.date);
      if (list) list.push(a);
      else map.set(a.date, [a]);
    }
    for (const list of map.values()) list.sort((x, y) => x.time.localeCompare(y.time));
    return map;
  }, [appointments]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedAppointments = byDate.get(selectedKey) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label="Previous month"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[150px] text-center text-sm font-medium">{format(currentMonth, "MMMM yyyy")}</span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label="Next month"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => {
              setCurrentMonth(new Date());
              setSelectedDate(new Date());
            }}
          >
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
          {loading && (
            <p className="mb-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </p>
          )}
          {/* Monday-first, matching the grid built above. */}
          <div className="grid grid-cols-7 gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayAppointments = byDate.get(key) ?? [];
              const liveCount = dayAppointments.filter((a) => LIVE.has(a.status)).length;
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`relative rounded-lg py-2 text-center text-sm transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-primary/10 font-semibold text-primary"
                        : isCurrentMonth
                          ? "hover:bg-accent"
                          : "text-muted-foreground/40 hover:bg-accent"
                  }`}
                >
                  {format(day, "d")}
                  {liveCount > 0 && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-primary">
                      {liveCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-base font-semibold">{format(selectedDate, "EEEE, MMMM d")}</h2>
          {selectedAppointments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No appointments on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedAppointments.map((a) => (
                <div key={a.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-medium">{a.patientName}</div>
                    <AppointmentStatusBadge status={a.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {a.time}–{a.endTime} · {TYPE_LABELS[a.type]}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.reason}</p>
                  <Link
                    to={`/doctor/patients/${a.patientId}`}
                    className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                  >
                    View patient
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
