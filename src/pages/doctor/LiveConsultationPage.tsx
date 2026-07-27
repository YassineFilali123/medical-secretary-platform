import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Hourglass,
  Loader2,
  Play,
  PlusCircle,
  Siren,
  TimerReset,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLiveConsultation } from "@/hooks/useLiveConsultation";
import { RequestExtraTimeModal } from "@/components/consultation/RequestExtraTimeModal";
import { AppointmentStatusBadge } from "@/components/appointments";
import {
  consultationService,
  formatDuration,
  REASON_LABELS,
  type AffectedAppointment,
  type ReasonCategory,
} from "@/services/consultation";
import { TYPE_LABELS } from "@/types/appointment";

export default function LiveConsultationPage() {
  const { consultation, upNext, pendingRequest, clock, loading, error, reload, start, end } =
    useLiveConsultation();

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState<{ message: string; affected: AffectedAppointment[] } | null>(null);

  const run = async (action: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "That action failed.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleExtend = async (input: {
    minutes: number;
    reasonCategory: ReasonCategory;
    reason?: string;
    isEmergency: boolean;
  }): Promise<boolean> => {
    if (!consultation) return false;

    setActionError(null);
    try {
      const result = await consultationService.extend({
        appointmentId: consultation.appointmentId,
        ...input,
      });
      setOutcome({ message: result.message, affected: result.affected });
      await reload();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not request extra time.");
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground shadow-soft">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Live Consultation</h1>
        <p className="text-sm text-muted-foreground">
          {consultation ? "In progress" : "Nothing running — start one from today's list below."}
        </p>
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

      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {actionError}
          </span>
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setActionError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {outcome && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-start gap-2 text-sm">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {outcome.message}
            </p>
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setOutcome(null)}>
              Dismiss
            </Button>
          </div>
          {outcome.affected.length > 0 && (
            <ul className="mt-3 space-y-1 pl-6 text-xs text-muted-foreground">
              {outcome.affected.map((a) => (
                <li key={a.id}>
                  {a.patientName}: {a.fromStart} → <span className="font-medium">{a.toStart}</span> (+
                  {a.delay} min)
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {consultation && clock ? (
        <>
          <Card
            className={`border-border shadow-soft ${
              clock.overrunning ? "ring-2 ring-destructive/30" : ""
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-primary text-base font-semibold text-white">
                    {consultation.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{consultation.patientName}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABELS[consultation.type]} · {consultation.reason}
                    </p>
                  </div>
                </div>
                <AppointmentStatusBadge status={consultation.status} />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric icon={Play} label="Started" value={consultation.startTime} />
                <Metric
                  icon={Clock}
                  label="Scheduled end"
                  value={consultation.endTime}
                  hint={
                    consultation.extendedMinutes > 0
                      ? `was ${consultation.originalEndTime} (+${consultation.extendedMinutes} min)`
                      : undefined
                  }
                />
                <Metric icon={Hourglass} label="Elapsed" value={formatDuration(clock.elapsedSeconds)} />
                {clock.overrunning ? (
                  <Metric
                    icon={TimerReset}
                    label="Over by"
                    value={formatDuration(clock.overrunSeconds)}
                    tone="danger"
                  />
                ) : (
                  <Metric
                    icon={TimerReset}
                    label="Remaining"
                    value={formatDuration(clock.remainingSeconds)}
                    tone={clock.remainingSeconds < 300 ? "warn" : undefined}
                  />
                )}
              </div>

              {clock.overrunning && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  This consultation is running past its scheduled end.
                  {upNext.length > 0 && " Your next patient is waiting."}
                </div>
              )}

              {pendingRequest && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Waiting on the front desk: +{pendingRequest.minutes} minutes
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {REASON_LABELS[pendingRequest.reasonCategory]}
                    {pendingRequest.reason ? ` — ${pendingRequest.reason}` : ""}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setActionError(null);
                    setExtendOpen(true);
                  }}
                  disabled={busy || !!pendingRequest}
                  className="rounded-xl bg-gradient-primary"
                >
                  <PlusCircle className="mr-1 h-4 w-4" /> Request Extra Time
                </Button>
              </div>

              <div className="border-t border-border pt-4">
                <Label>Consultation notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                  placeholder="Findings, prescriptions, follow-up…"
                  className="mt-2 min-h-[90px] rounded-xl"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Saved against the appointment when you end the consultation. Staff only.
                </p>
                <Button
                  onClick={async () => {
                    const done = await run(() => end(consultation.appointmentId, notes.trim() || undefined));
                    if (done) {
                      setNotes("");
                      setOutcome(null);
                    }
                  }}
                  disabled={busy}
                  className="mt-3 rounded-xl"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Ending…
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-1 h-4 w-4" /> End &amp; Complete
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card className="border-border shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            {consultation ? "Waiting" : "Today's appointments"} ({upNext.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upNext.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {consultation ? "Nobody else is waiting today." : "Nothing scheduled for today."}
            </p>
          ) : (
            <div className="space-y-2">
              {upNext.map((a) => (
                <div
                  key={a.appointmentId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {a.patientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.patientName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.startTime}–{a.endTime} · {a.reason}
                        {a.delayedMinutes > 0 && (
                          <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                            (delayed {a.delayedMinutes} min)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <AppointmentStatusBadge status={a.status} />
                    {a.status === "confirmed" && !consultation && (
                      <Button
                        size="sm"
                        className="rounded-lg bg-gradient-health text-xs"
                        disabled={busy}
                        onClick={() => void run(() => start(a.appointmentId))}
                      >
                        <Play className="mr-1 h-3 w-3" /> Start
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {consultation && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Siren className="h-3 w-3" /> End the current consultation before starting another.
            </p>
          )}
        </CardContent>
      </Card>

      <RequestExtraTimeModal
        open={extendOpen}
        consultation={consultation}
        error={actionError}
        onClose={() => setExtendOpen(false)}
        onSubmit={handleExtend}
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className={`mt-1 font-mono text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
