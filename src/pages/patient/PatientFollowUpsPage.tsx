import { useEffect, useState } from "react";
import {
  CheckCircle,
  Clock,
  Loader2,
  Stethoscope,
  Timer,
  XCircle,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
// CheckCircle used in success banner & booking confirm button
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  type FollowUpRecommendation,
  type FollowUpStatus,
  followUpService,
} from "@/services/followup";

type PriorityStyle = { bg: string; fg: string; label: string };
const DEFAULT_PRIORITY: PriorityStyle = { bg: "bg-blue-100", fg: "text-blue-700", label: "Routine" };
const PRIORITY_STYLES = {
  routine: { bg: "bg-blue-100", fg: "text-blue-700", label: "Routine" },
  recommended: { bg: "bg-amber-100", fg: "text-amber-700", label: "Recommended" },
  urgent: { bg: "bg-red-100", fg: "text-red-700", label: "Urgent" },
} as const;

function getPriorityStyle(priority: string): PriorityStyle {
  const p = PRIORITY_STYLES[priority as keyof typeof PRIORITY_STYLES];
  return p ?? DEFAULT_PRIORITY;
}

const STATUS_ICONS: Record<FollowUpStatus, typeof Clock> = {
  pending: Clock,
  accepted: CheckCircle,
  booked: CheckCircle,
  cancelled: XCircle,
  expired: Timer,
};

export default function PatientFollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUpRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await followUpService.patientList();
      setFollowUps(res.followUps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load follow-ups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleBook = async (id: number, date: string, time: string) => {
    setBusy(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await followUpService.book(id, date, time);
      setSuccess(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not book appointment.");
    } finally {
      setBusy(null);
    }
  };

  const pending = followUps.filter((f) => f.status === "pending");
  const resolved = followUps.filter((f) => f.status !== "pending");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Follow-up Appointments</h1>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
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
            <p className="text-sm text-muted-foreground">No follow-up recommendations yet.</p>
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
                <FollowUpCard
                  key={f.id}
                  followUp={f}
                  busy={busy === f.id}
                  onBook={handleBook}
                />
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                History ({resolved.length})
              </h2>
              {resolved.map((f) => (
                <FollowUpCard key={f.id} followUp={f} busy={busy === f.id} onBook={() => {}} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FollowUpCard({
  followUp: f,
  busy,
  onBook,
}: {
  followUp: FollowUpRecommendation;
  busy: boolean;
  onBook: (id: number, date: string, time: string) => void;
}) {
  const [booking, setBooking] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const priority = getPriorityStyle(f.priority);
  const StatusIcon = STATUS_ICONS[f.status];
  const isPending = f.status === "pending";
  const isUrgent = f.priority === "urgent" && isPending;

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <Card className={isUrgent ? "border-red-200 bg-red-50/30" : ""}>
      <CardContent className="space-y-3 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{f.doctorName || "Doctor"}</h3>
              <p className="text-xs text-muted-foreground">
                {f.type === "none"
                  ? "No follow-up needed"
                  : f.periodLabel || "Follow-up recommended"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priority.bg} ${priority.fg}`}>
              {priority.label}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <StatusIcon className="h-3 w-3" />
              {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Note */}
        {f.note && (
          <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">{f.note}</p>
        )}

        {/* Expires */}
        {f.expiresAt && isPending && (
          <p className="text-xs text-muted-foreground">
            <Clock className="mr-1 inline h-3 w-3" />
            Expires: {new Date(f.expiresAt).toLocaleDateString()}
          </p>
        )}

        {/* Actions */}
        {isPending && f.type === "period" && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {!booking && (
              <Button
                size="sm"
                className="rounded-xl bg-gradient-primary"
                onClick={() => setBooking(true)}
              >
                <CalendarDays className="mr-1 h-3 w-3" /> Book Appointment
              </Button>
            )}

            {booking && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={date}
                  min={todayStr}
                  max={f.expiresAt ? f.expiresAt.split(" ")[0] : undefined}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 rounded-xl border border-input bg-background px-2 text-xs"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-8 rounded-xl border border-input bg-background px-2 text-xs"
                />
                <Button
                  size="sm"
                  className="rounded-xl bg-gradient-primary"
                  disabled={busy || !date || !time}
                  onClick={() => {
                    onBook(f.id, date, time);
                    setBooking(false);
                  }}
                >
                  {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => setBooking(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
