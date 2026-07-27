import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { availabilityService, DAY_LABELS, type SlotDay } from "@/services/availability";

export type SlotChoice = { date: string; time: string };

type SlotPickerProps = {
  doctorId: number;
  /** Reschedule: frees the slot this appointment already occupies. */
  excludeAppointmentId?: number;
  value: SlotChoice | null;
  onChange: (choice: SlotChoice) => void;
};

/**
 * Picks a real, currently-free slot from the doctor's published availability.
 *
 * Deliberately has no hardcoded time list. The old modal offered a fixed
 * 09:00-16:30 grid that ignored the doctor's actual hours, days off and existing
 * bookings, so most of what it showed could not in fact be booked.
 */
export function SlotPicker({ doctorId, excludeAppointmentId, value, onChange }: SlotPickerProps) {
  const [days, setDays] = useState<SlotDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDate, setOpenDate] = useState<string | null>(value?.date ?? null);
  const [reloadKey, setReloadKey] = useState(0);

  // A doctor switched mid-load must not have their slots overwritten by the
  // previous doctor's response.
  const requestId = useRef(0);

  useEffect(() => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);

    availabilityService
      .slots(doctorId, { excludeAppointmentId })
      .then((data) => {
        if (current !== requestId.current) return;
        setDays(data);
        setLoading(false);
        // Open the first day that actually has something to offer.
        setOpenDate((previous) => {
          if (previous && data.some((d) => d.date === previous && d.slots.length > 0)) return previous;
          return data.find((d) => d.slots.length > 0)?.date ?? null;
        });
      })
      .catch((err: unknown) => {
        if (current !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Could not load available times.");
        setLoading(false);
      });
  }, [doctorId, excludeAppointmentId, reloadKey]);

  const bookableDays = useMemo(() => days.filter((d) => d.slots.length > 0), [days]);
  const openDay = days.find((d) => d.date === openDate) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading available times…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setReloadKey((k) => k + 1)}>
          <RefreshCw className="mr-1 h-3 w-3" /> Try again
        </Button>
      </div>
    );
  }

  if (bookableDays.length === 0) {
    return (
      <div className="rounded-xl border border-border p-8 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">
          This doctor has no free appointments in the next two weeks.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Try another doctor, or check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Available days</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      <div className="grid max-h-[132px] grid-cols-3 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-4">
        {bookableDays.map((day) => {
          const active = day.date === openDate;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setOpenDate(day.date)}
              className={`rounded-lg border p-2 text-center text-xs transition-colors ${
                active
                  ? "border-primary bg-primary/5 font-medium text-primary"
                  : "border-border hover:bg-accent"
              }`}
            >
              <span className="block font-medium">{DAY_LABELS[day.dayOfWeek].slice(0, 3)}</span>
              <span className="block text-[11px] text-muted-foreground">{formatDayLabel(day.date)}</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {day.slots.length} free
              </span>
            </button>
          );
        })}
      </div>

      {openDay && (
        <>
          <p className="text-xs font-medium text-muted-foreground">
            Times on {DAY_LABELS[openDay.dayOfWeek]}, {formatDayLabel(openDay.date)}
          </p>
          <div className="grid max-h-[160px] grid-cols-4 gap-1.5 overflow-y-auto pr-1">
            {openDay.slots.map((slot) => {
              const selected = value?.date === openDay.date && value?.time === slot.start;
              return (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => onChange({ date: openDay.date, time: slot.start })}
                  title={`${slot.start} – ${slot.end}`}
                  className={`rounded-lg border p-2 text-xs transition-colors ${
                    selected
                      ? "border-primary bg-primary/5 font-medium text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <Clock className="mx-auto mb-0.5 h-3 w-3" />
                  {slot.start}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** "2026-07-27" -> "Jul 27". Parsed as local time so the date cannot slip a day. */
function formatDayLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
