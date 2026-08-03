import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Plus, Trash2, CalendarCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  availabilityService,
  DAY_LABELS,
  SLOT_LENGTHS,
  type DaySchedule,
  type SlotDay,
  type TimeOff,
} from "@/services/availability";

/** Monday-first display order over the Sunday-first data model. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** "HH:MM" → minutes since midnight. Returns NaN on anything unparseable. */
function toMinutes(hhmm: string): number {
  const parts = hhmm.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.NaN;
  return h * 60 + m;
}

function minutesBetween(start: string, end: string): number {
  const diff = toMinutes(end) - toMinutes(start);
  return Number.isFinite(diff) ? diff : 0;
}

function slotCount(day: DaySchedule): number {
  if (!day.isEnabled) return 0;
  const span = minutesBetween(day.startTime, day.endTime);
  if (span <= 0 || day.slotMinutes <= 0) return 0;
  return Math.floor(span / day.slotMinutes);
}

/**
 * Mirrors the server's validation exactly. The end-after-start rule applies to
 * EVERY row (the database CHECK is per-row), not only enabled days — otherwise
 * a bad pair could be hidden behind a switched-off day and block the whole save.
 */
function dayError(day: DaySchedule): string | null {
  const span = minutesBetween(day.startTime, day.endTime);
  if (span <= 0) return "The end time must be after the start time.";
  if (day.isEnabled && span < day.slotMinutes) {
    return `The working window is shorter than one ${day.slotMinutes}-minute slot.`;
  }
  return null;
}

export default function AvailabilityPage() {
  const { user } = useAuth();

  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [offStart, setOffStart] = useState("");
  const [offEnd, setOffEnd] = useState("");
  const [offReason, setOffReason] = useState("");
  const [addingOff, setAddingOff] = useState(false);

  const [preview, setPreview] = useState<SlotDay[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await availabilityService.get();
      setSchedule(data.schedule);
      setTimeOff(data.timeOff);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load availability.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const doctorId = user ? Number(user.id) : null;

  const loadPreview = useCallback(async () => {
    if (doctorId === null) return;
    setPreviewLoading(true);
    try {
      setPreview(await availabilityService.slots(doctorId));
    } catch {
      // The preview is a convenience; a failure here must not mask the editor.
      setPreview([]);
    } finally {
      setPreviewLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (!loading) void loadPreview();
  }, [loading, loadPreview]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice((n) => (n === message ? null : n)), 4000);
  }

  function patchDay(dayOfWeek: number, patch: Partial<DaySchedule>) {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)),
    );
    setDirty(true);
    setSavedAt(false);
  }

  async function handleSave() {
    // Snapshot what we send. If the doctor edits another day while the request
    // is in flight, applying the server echo would silently discard that edit.
    const sent = schedule;

    setSaving(true);
    setError(null);
    try {
      const data = await availabilityService.saveSchedule(sent);
      setTimeOff(data.timeOff);

      setSchedule((current) => {
        if (current !== sent) {
          // Edited mid-flight — keep the newer local state and stay dirty.
          return current;
        }
        setDirty(false);
        setSavedAt(true);
        window.setTimeout(() => setSavedAt(false), 2500);
        return data.schedule;
      });

      void loadPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save availability.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTimeOff() {
    if (!offStart) return;
    setAddingOff(true);
    setError(null);
    try {
      const next = await availabilityService.addTimeOff({
        startDate: offStart,
        endDate: offEnd || undefined,
        reason: offReason.trim() || undefined,
      });
      setTimeOff(next);
      setOffStart("");
      setOffEnd("");
      setOffReason("");
      flash("Time off added.");
      void loadPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add time off.");
    } finally {
      setAddingOff(false);
    }
  }

  async function handleRemoveTimeOff(id: number) {
    setError(null);
    try {
      setTimeOff(await availabilityService.removeTimeOff(id));
      flash("Time off removed.");
      void loadPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove time off.");
    }
  }

  const orderedDays = useMemo(
    () =>
      DISPLAY_ORDER.map((d) => schedule.find((s) => s.dayOfWeek === d)).filter(
        (d): d is DaySchedule => d !== undefined,
      ),
    [schedule],
  );

  const weeklySlots = orderedDays.reduce((sum, d) => sum + slotCount(d), 0);
  const workingDays = orderedDays.filter((d) => d.isEnabled).length;
  const bookableDays = preview.filter((d) => d.slots.length > 0).length;
  const hasInvalidDay = orderedDays.some((d) => dayError(d) !== null);

  // Warn before losing unsaved edits — the sidebar is one click away.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
          <p className="text-sm text-muted-foreground">
            Set the hours you see patients. Appointment slots are generated from this.
          </p>
        </div>
        <Button
          onClick={() => void handleSave()}
          disabled={saving || loading || !dirty || hasInvalidDay}
          title={hasInvalidDay ? "Fix the highlighted day before saving." : undefined}
          className="rounded-xl bg-gradient-primary"
        >
          {saving
            ? "Saving..."
            : savedAt
              ? "Saved!"
              : hasInvalidDay
                ? "Fix errors first"
                : dirty
                  ? "Save Changes"
                  : "No changes"}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-2 text-sm text-green-700 dark:text-green-400">
          {notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="text-sm text-muted-foreground">Working days</div>
          <div className="mt-1 text-2xl font-semibold">{workingDays}<span className="text-base text-muted-foreground">/7</span></div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="text-sm text-muted-foreground">Slots per week</div>
          <div className="mt-1 text-2xl font-semibold">{weeklySlots}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="text-sm text-muted-foreground">Bookable days</div>
          <div className="mt-1 text-2xl font-semibold">{bookableDays}</div>
          <div className="text-xs text-muted-foreground">Next 30 days</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ------------------------- weekly hours ------------------------- */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" /> Working Days &amp; Hours
          </h2>

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-2">
              {orderedDays.map((day) => {
                const problem = dayError(day);

                return (
                  <div
                    key={day.dayOfWeek}
                    className={`rounded-xl border p-3 ${problem ? "border-destructive/50" : "border-border"}`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex min-w-[110px] items-center gap-2">
                        <input
                          type="checkbox"
                          checked={day.isEnabled}
                          disabled={saving}
                          onChange={(e) => patchDay(day.dayOfWeek, { isEnabled: e.target.checked })}
                          className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium">{DAY_LABELS[day.dayOfWeek]}</span>
                      </label>

                      {/* Always rendered — dimmed when the day is off. Hiding
                          them would make an invalid pair impossible to fix. */}
                      <div
                        className={`flex flex-wrap items-center gap-2 ${day.isEnabled ? "" : "opacity-50"}`}
                      >
                        <input
                          type="time"
                          value={day.startTime}
                          disabled={saving}
                          onChange={(e) => patchDay(day.dayOfWeek, { startTime: e.target.value })}
                          aria-label={`${DAY_LABELS[day.dayOfWeek]} start time`}
                          className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <input
                          type="time"
                          value={day.endTime}
                          disabled={saving}
                          onChange={(e) => patchDay(day.dayOfWeek, { endTime: e.target.value })}
                          aria-label={`${DAY_LABELS[day.dayOfWeek]} end time`}
                          className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                        />
                        <select
                          value={day.slotMinutes}
                          disabled={saving}
                          onChange={(e) =>
                            patchDay(day.dayOfWeek, { slotMinutes: Number(e.target.value) })
                          }
                          aria-label={`${DAY_LABELS[day.dayOfWeek]} slot length`}
                          className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                        >
                          {SLOT_LENGTHS.map((m) => (
                            <option key={m} value={m}>
                              {m} min
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-muted-foreground">
                          {day.isEnabled ? `${slotCount(day)} slots` : "Day off"}
                        </span>
                      </div>
                    </div>

                    {problem && <p className="mt-2 text-xs text-destructive">{problem}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --------------------------- time off --------------------------- */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Calendar className="h-4 w-4 text-primary" aria-hidden="true" /> Time Off
          </h2>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="off-start">From</Label>
                <Input
                  id="off-start"
                  type="date"
                  value={offStart}
                  onChange={(e) => setOffStart(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="off-end">To (optional)</Label>
                <Input
                  id="off-end"
                  type="date"
                  value={offEnd}
                  min={offStart || undefined}
                  onChange={(e) => setOffEnd(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="off-reason">Reason (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="off-reason"
                  placeholder="Summer holiday"
                  value={offReason}
                  onChange={(e) => setOffReason(e.target.value)}
                  maxLength={160}
                  className="h-10 rounded-xl"
                />
                <button
                  onClick={() => void handleAddTimeOff()}
                  disabled={!offStart || addingOff}
                  aria-label="Add time off"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-white disabled:opacity-50 focus-ring"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave &ldquo;To&rdquo; empty for a single day.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {timeOff.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No time off booked.</p>
            ) : (
              timeOff.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-border p-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {t.startDate === t.endDate ? t.startDate : `${t.startDate} → ${t.endDate}`}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {t.days} day{t.days === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{t.reason || "Day off"}</div>
                  </div>
                  <button
                    onClick={() => void handleRemoveTimeOff(t.id)}
                    aria-label={`Remove time off starting ${t.startDate}`}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-ring"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ------------------------ generated slots ------------------------ */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
          <CalendarCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Upcoming Availability ({preview.length} Days)
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Showing consecutive availability for the next 30 days starting from today, generated from your schedule and bookings.
        </p>

        {previewLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Calculating...</p>
        ) : preview.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No slot data.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((day) => (
              <div
                key={day.date}
                className={`rounded-xl border p-3 transition-all ${
                  day.isTimeOff
                    ? "border-red-200 bg-red-50/40"
                    : day.isFullyBooked
                      ? "border-orange-200 bg-orange-50/40"
                      : day.workingHours
                        ? "border-border bg-card"
                        : "border-border bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {DAY_LABELS[day.dayOfWeek]} {day.date.slice(5)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      day.isTimeOff
                        ? "bg-red-100 text-red-700"
                        : day.isFullyBooked
                          ? "bg-orange-100 text-orange-700"
                          : day.workingHours
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {day.isTimeOff
                      ? "Time Off"
                      : day.isFullyBooked
                        ? "Fully Booked"
                        : day.workingHours
                          ? `${day.slots.length} slots`
                          : "Closed"}
                  </span>
                </div>

                {day.workingHours && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Hours: {day.workingHours.start} – {day.workingHours.end}
                  </p>
                )}

                {day.existingAppointments && day.existingAppointments.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[10px] font-medium text-muted-foreground">
                      Booked ({day.existingAppointments.length}):
                    </p>
                    <div className="space-y-0.5 max-h-16 overflow-y-auto">
                      {day.existingAppointments.map((apt, idx) => (
                        <div key={idx} className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span>• {apt.start}–{apt.end}</span>
                          <span className="capitalize text-[9px] opacity-75">({apt.status})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {day.slots.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {day.slots.slice(0, 6).map((s) => (
                      <span
                        key={s.start}
                        className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary"
                      >
                        {s.start}
                      </span>
                    ))}
                    {day.slots.length > 6 && (
                      <span className="px-1 py-0.5 text-[11px] text-muted-foreground">
                        +{day.slots.length - 6} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
