import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  type FollowUpRecommendation,
  type CalendarDay,
  followUpService,
} from "@/services/followup";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type PriorityStyle = { bg: string; fg: string; label: string };
const DEFAULT_PRIORITY: PriorityStyle = { bg: "bg-blue-100", fg: "text-blue-700", label: "Routine" };
const PRIORITY_STYLES: Record<string, PriorityStyle> = {
  routine:     { bg: "bg-blue-100",   fg: "text-blue-700",   label: "Routine" },
  recommended: { bg: "bg-indigo-100", fg: "text-indigo-700", label: "Recommended" },
  urgent:      { bg: "bg-red-100",    fg: "text-red-700",    label: "Urgent" },
};
function getPriorityStyle(priority: string): PriorityStyle {
  return PRIORITY_STYLES[priority] ?? DEFAULT_PRIORITY;
}

function getStatusStyle(status: string): { bg: string; fg: string } {
  switch (status) {
    case "booked":    return { bg: "bg-green-100",  fg: "text-green-700" };
    case "cancelled": return { bg: "bg-red-100",    fg: "text-red-700" };
    case "expired":   return { bg: "bg-gray-100",   fg: "text-gray-500" };
    default:          return { bg: "bg-blue-100",   fg: "text-blue-700" }; // pending / accepted
  }
}

export default function SecretaryFollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUpRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await followUpService.secretaryList();
      setFollowUps(res.followUps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load follow-ups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pending = followUps.filter((f) => f.status === "pending");
  const resolved = followUps.filter((f) => f.status !== "pending");

  if (selectedId !== null) {
    return (
      <FollowUpCalendarView
        followUpId={selectedId}
        onBack={() => {
          setSelectedId(null);
          setSuccess(null);
          void load();
        }}
        success={success}
        setSuccess={setSuccess}
        setError={setError}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Follow-up Recommendations</h1>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      {loading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : followUps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Stethoscope className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No follow-up recommendations.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Pending ({pending.length})
              </h2>
              {pending.map((f) => (
                <FollowUpRow key={f.id} followUp={f} onClick={() => setSelectedId(f.id)} />
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                History ({resolved.length})
              </h2>
              {resolved.map((f) => (
                <FollowUpRow key={f.id} followUp={f} onClick={() => setSelectedId(f.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FollowUpRow({ followUp: f, onClick }: { followUp: FollowUpRecommendation; onClick: () => void }) {
  const priority = getPriorityStyle(f.priority);
  const statusStyle = getStatusStyle(f.status);
  const isUrgent = f.priority === "urgent" && f.status === "pending";

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${isUrgent ? "border-red-200 bg-red-50/30" : ""}`}
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{f.patientName || "Patient"}</h3>
            <p className="text-xs text-muted-foreground">
              {f.doctorName} &middot; {f.periodLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priority.bg} ${priority.fg}`}>
            {priority.label}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyle.bg} ${statusStyle.fg}`}>
            {f.status}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Calendar View ────────────────────────────────────────────

function FollowUpCalendarView({
  followUpId,
  onBack,
  success,
  setSuccess,
  setError,
  error,
}: {
  followUpId: number;
  onBack: () => void;
  success: string | null;
  setSuccess: (v: string | null) => void;
  setError: (v: string | null) => void;
  error: string | null;
}) {
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [followUp, setFollowUp] = useState<FollowUpRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [booking, setBooking] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);

  useEffect(() => {
    followUpService
      .calendar(followUpId)
      .then((res) => {
        setDays(res.days);
        setFollowUp(res.followUp);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load calendar.");
      })
      .finally(() => setLoading(false));
  }, [followUpId, setError]);

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + weekOffset * 7 - today.getDay() + 1); // Monday-first
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const getDayData = (date: Date): CalendarDay | undefined => {
    const dateStr = date.toISOString().split("T")[0];
    return days.find((d) => d.date === dateStr);
  };

  const handleBook = async (override: boolean) => {
    if (!selectedDay || !selectedTime) return;
    setBooking(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await followUpService.secretaryBook(followUpId, selectedDay.date, selectedTime, override);
      setSuccess(res.message);
      setWarningOpen(false);
      // Reload calendar
      const res2 = await followUpService.calendar(followUpId);
      setDays(res2.days);
      setFollowUp(res2.followUp);
      setSelectedDay(null);
      setSelectedTime("");
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "WARNING_REQUIRED") {
        setWarningOpen(true);
      } else {
        setError(e.message || "Could not book appointment.");
      }
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to list
      </button>

      {/* Patient info */}
      {followUp && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">{followUp.patientName}</h2>
                <p className="text-xs text-muted-foreground">
                  {followUp.doctorName} &middot; {followUp.periodLabel} &middot; Priority: {followUp.priority}
                </p>
              </div>
            </div>
            {(() => {
              const s = getStatusStyle(followUp.status);
              return (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${s.bg} ${s.fg}`}>
                  {followUp.status}
                </span>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-green-500" /> Within follow-up period
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-400" /> Outside follow-up period
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-gray-300" /> No schedule / day off
        </span>
      </div>

      {/* Calendar navigation */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {weekDays[0]!.toLocaleDateString("en", { month: "short", day: "numeric" })} –{" "}
          {weekDays[6]!.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="rounded-lg border border-border px-3 text-xs font-medium hover:bg-accent"
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid gap-2 lg:grid-cols-7">
        {weekDays.map((date) => {
          const dayData = getDayData(date);
          const isSelected = selectedDay?.date === dayData?.date;
          const isToday = date.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];

          // Color: green = within period, red = outside period, gray = no backend data (far future)
          const bgClass = dayData
            ? dayData.status === "green"
              ? "bg-green-50 border-green-300"
              : "bg-red-50 border-red-200"
            : "bg-muted/30 border-border";

          return (
            <div
              key={date.toISOString()}
              className={`min-h-[140px] rounded-xl border p-2 transition-all ${bgClass} ${
                isSelected ? "ring-2 ring-primary" : ""
              } ${isToday ? "ring-1 ring-primary/30" : ""}`}
            >
              <div className="text-center">
                <div className="text-[10px] font-medium text-muted-foreground">
                  {DAY_NAMES[date.getDay()]}
                </div>
                <div className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>
                  {date.getDate()}
                </div>
              </div>

              {dayData?.isTimeOff && (
                <div className="mt-1 rounded bg-red-100 px-1 py-0.5 text-center text-[9px] text-red-600">
                  Day off
                </div>
              )}

              {dayData && !dayData.workingHours && !dayData.isTimeOff && (
                <div className="mt-1 rounded bg-gray-100 px-1 py-0.5 text-center text-[9px] text-gray-500">
                  Not working
                </div>
              )}

              {dayData?.workingHours && (
                <div className="mt-1 space-y-0.5">
                  <div className="rounded bg-green-100 px-1 py-0.5 text-center text-[9px] text-green-700">
                    {dayData.workingHours.start}–{dayData.workingHours.end}
                  </div>
                </div>
              )}

              {dayData?.isFullyBooked && (
                <div className="mt-1 rounded bg-orange-100 px-1 py-0.5 text-center text-[9px] text-orange-600">
                  Fully booked
                </div>
              )}

              {dayData && dayData.appointmentCount > 0 && (
                <div className="mt-1 text-center text-[9px] text-muted-foreground">
                  {dayData.appointmentCount} appt{dayData.appointmentCount > 1 ? "s" : ""}
                </div>
              )}

              {dayData && (
                <button
                  onClick={() => {
                    setSelectedDay(dayData);
                    setSelectedTime("");
                  }}
                  className="mt-1.5 w-full rounded-lg bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary hover:bg-primary/20"
                >
                  Select
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day details */}
      {selectedDay && (
        <Card className="border-primary/30">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {new Date(selectedDay.date + "T00:00:00").toLocaleDateString("en", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h4>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            {selectedDay.status === "red" && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  This date is <strong>outside</strong> the doctor's recommended follow-up period. You can still book,
                  but you will be asked to confirm.
                </span>
              </div>
            )}

            {selectedDay.isTimeOff && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" /> Doctor has time off on this day.
              </div>
            )}

            {/* Doctor's working hours */}
            {selectedDay.workingHours ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Doctor's Working Hours</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    <Clock className="h-3 w-3" />
                    {selectedDay.workingHours.start} – {selectedDay.workingHours.end}
                  </span>
                </div>
              </div>
            ) : (
              !selectedDay.isTimeOff && (
                <p className="text-xs text-muted-foreground">
                  The doctor is not scheduled to work on this day. You can still enter a time manually.
                </p>
              )
            )}

            {/* Available time slots */}
            {selectedDay.availableSlots && selectedDay.availableSlots.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Available Slots ({selectedDay.availableSlots.length})
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedDay.availableSlots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedTime(slot.start)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                        selectedTime === slot.start
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {slot.start}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedDay.availableSlots && selectedDay.availableSlots.length === 0 && selectedDay.workingHours && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                All slots are booked on this day. You can still enter a time manually.
              </div>
            )}

            {/* Existing appointments */}
            {selectedDay.existingAppointments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Existing Appointments ({selectedDay.existingAppointments.length})
                </p>
                <div className="mt-1.5 space-y-1">
                  {selectedDay.existingAppointments.map((apt, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {apt.start}–{apt.end}
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] capitalize">{apt.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual time input */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium">Appointment Time:</label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
              />
            </div>

            {/* Book button */}
            <Button
              className="w-full rounded-xl bg-gradient-primary"
              disabled={!selectedTime || booking}
              onClick={() => void handleBook(false)}
            >
              {booking ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <CalendarDays className="mr-1 h-4 w-4" />
              )}
              Book Appointment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Warning modal */}
      {warningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Outside Recommended Period</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This appointment is outside the doctor's recommended follow-up period. Are you sure you want to
                  continue?
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Booking for{" "}
              <span className="font-medium">
                {selectedDay &&
                  new Date(selectedDay.date + "T00:00:00").toLocaleDateString("en", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
              </span>{" "}
              at <span className="font-medium">{selectedTime}</span>.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setWarningOpen(false)}
              >
                Cancel — choose a recommended date
              </Button>
              <Button
                className="rounded-xl bg-gradient-primary"
                disabled={booking}
                onClick={() => void handleBook(true)}
              >
                {booking ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                Continue anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
