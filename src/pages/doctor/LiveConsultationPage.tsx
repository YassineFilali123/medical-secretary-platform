import { useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Droplets,
  FileText,
  Heart,
  Hourglass,
  Loader2,
  Mail,
  Phone,
  Play,
  PlusCircle,
  Shield,
  Siren,
  TimerReset,
  User,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveConsultation } from "@/hooks/useLiveConsultation";
import { RequestExtraTimeModal } from "@/components/consultation/RequestExtraTimeModal";
import { ConsultationReportModal } from "@/components/consultation/ConsultationReportModal";
import { FollowUpModal } from "@/components/consultation/FollowUpModal";
import { AppointmentStatusBadge } from "@/components/appointments";
import {
  consultationService,
  formatDuration,
  REASON_LABELS,
  type AffectedAppointment,
  type ConsultationReport,
  type ReasonCategory,
} from "@/services/consultation";
import { TYPE_LABELS } from "@/types/appointment";

export default function LiveConsultationPage() {
  const { consultation, upNext, pendingRequest, clock, loading, error, reload, start, end } =
    useLiveConsultation();

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ message: string; affected: AffectedAppointment[] } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("patient");

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

  const handleEndWithReport = async (report: ConsultationReport): Promise<boolean> => {
    if (!consultation) return false;
    setReportError(null);
    try {
      await consultationService.endWithReport(consultation.appointmentId, report);
      setReportOpen(false);
      setFollowUpOpen(true);
      return true;
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Could not save the report.");
      return false;
    }
  };

  const handleEndQuick = async () => {
    if (!consultation) return;
    const done = await run(() => end(consultation.appointmentId));
    if (done) setOutcome(null);
  };

  const toggleSection = (section: string) =>
    setExpandedSection((current) => (current === section ? null : section));

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground shadow-soft">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const patient = consultation?.patientInfo ?? null;
  const previousConsultations = consultation?.previousConsultations ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Live Consultation</h1>
        <p className="text-sm text-muted-foreground">
          {consultation
            ? "In progress — patient information and consultation tools below."
            : "Nothing running — consultations start automatically at the scheduled time."}
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
                  {a.patientName}: {a.fromStart} → <span className="font-medium">{a.toStart}</span> (+{a.delay} min)
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {consultation && clock ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main consultation area — 2 columns */}
          <div className="space-y-4 lg:col-span-2">
            {/* Patient header */}
            <Card className={`border-border shadow-soft ${clock.overrunning ? "ring-2 ring-destructive/30" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {patient?.avatarUrl ? (
                      <img
                        src={patient.avatarUrl}
                        alt={consultation.patientName}
                        className="h-14 w-14 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-primary text-lg font-semibold text-white">
                        {consultation.patientName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{consultation.patientName}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_LABELS[consultation.type]} · {consultation.reason}
                        {patient?.age && ` · ${patient.age} years old`}
                        {patient?.gender && ` · ${patient.gender}`}
                      </p>
                    </div>
                  </div>
                  <AppointmentStatusBadge status={consultation.status} />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Timer metrics */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric icon={Calendar} label="Date" value={consultation.date} />
                  <Metric icon={Clock} label="Scheduled" value={`${consultation.startTime} – ${consultation.endTime}`} />
                  <Metric icon={Hourglass} label="Elapsed" value={formatDuration(clock.elapsedSeconds)} />
                  {clock.overrunning ? (
                    <Metric icon={TimerReset} label="Over by" value={formatDuration(clock.overrunSeconds)} tone="danger" />
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
                    Running past scheduled end.
                    {upNext.length > 0 && " Your next patient is waiting."}
                  </div>
                )}

                {pendingRequest && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                    <p className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Waiting on front desk: +{pendingRequest.minutes} minutes
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {REASON_LABELS[pendingRequest.reasonCategory]}
                      {pendingRequest.reason ? ` — ${pendingRequest.reason}` : ""}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => { setActionError(null); setExtendOpen(true); }}
                    disabled={busy || !!pendingRequest}
                    className="rounded-xl bg-gradient-primary"
                  >
                    <PlusCircle className="mr-1 h-4 w-4" /> Request Extra Time
                  </Button>
                  <Button
                    onClick={() => { setReportError(null); setReportOpen(true); }}
                    className="rounded-xl"
                  >
                    <FileText className="mr-1 h-4 w-4" /> End Consultation
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={handleEndQuick} disabled={busy}>
                    {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                    Quick End (no report)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Collapsible patient info sections */}
            {patient && (
              <Card className="border-border shadow-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4 text-primary" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 divide-y divide-border p-0">
                  <InfoSection
                    title="Contact & Identity"
                    icon={User}
                    open={expandedSection === "patient"}
                    onToggle={() => toggleSection("patient")}
                  >
                    <InfoRow icon={Mail} label="Email" value={patient.email} />
                    <InfoRow icon={Phone} label="Phone" value={patient.phone ?? "Not provided"} />
                    <InfoRow icon={Droplets} label="Blood Type" value={patient.bloodType ?? "Unknown"} />
                    <InfoRow icon={Calendar} label="Date of Birth" value={patient.dateOfBirth ?? "Not provided"} />
                  </InfoSection>

                  <InfoSection
                    title="Medical Information"
                    icon={Heart}
                    open={expandedSection === "medical"}
                    onToggle={() => toggleSection("medical")}
                  >
                    <InfoRow
                      icon={AlertTriangle}
                      label="Allergies"
                      value={patient.allergies ?? "None reported"}
                      highlight={!!patient.allergies}
                    />
                    <InfoRow icon={Shield} label="Emergency Contact" value={patient.emergencyContact ?? "Not provided"} />
                  </InfoSection>

                  {previousConsultations.length > 0 && (
                    <InfoSection
                      title={`Previous Consultations (${previousConsultations.length})`}
                      icon={FileText}
                      open={expandedSection === "history"}
                      onToggle={() => toggleSection("history")}
                    >
                      <div className="space-y-3">
                        {previousConsultations.map((pc) => (
                          <div key={pc.appointmentId} className="rounded-xl border border-border p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{pc.date} at {pc.time}</span>
                              <span className="text-xs text-muted-foreground">{pc.reason}</span>
                            </div>
                            {pc.diagnosis && (
                              <p className="mt-1 text-xs">
                                <span className="font-medium text-primary">Diagnosis:</span> {pc.diagnosis}
                              </p>
                            )}
                            {pc.prescription && (
                              <p className="mt-0.5 text-xs">
                                <span className="font-medium text-primary">Rx:</span> {pc.prescription}
                              </p>
                            )}
                            {pc.notes && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{pc.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </InfoSection>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right sidebar — patient quick info */}
          <div className="space-y-4">
            {patient && (
              <Card className="border-border shadow-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Quick Reference</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <QuickFact icon={User} label="Age" value={patient.age ? `${patient.age} years` : "—"} />
                  <QuickFact icon={Heart} label="Gender" value={patient.gender ?? "—"} />
                  <QuickFact icon={Droplets} label="Blood Type" value={patient.bloodType ?? "—"} />
                  <QuickFact icon={Phone} label="Phone" value={patient.phone ?? "—"} />
                  {patient.allergies && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                        <AlertTriangle className="h-3 w-3" /> Allergies
                      </p>
                      <p className="mt-0.5 text-xs text-destructive/80">{patient.allergies}</p>
                    </div>
                  )}
                  {patient.emergencyContact && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <Phone className="h-3 w-3" /> Emergency Contact
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{patient.emergencyContact}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Appointment details */}
            <Card className="border-border shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{TYPE_LABELS[consultation.type]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{consultation.duration} min</span>
                </div>
                {consultation.extendedMinutes > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Extended</span>
                    <span className="font-medium">+{consultation.extendedMinutes} min</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span className="font-mono font-medium">{consultation.startTime}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Waiting queue */}
      <Card className="border-border shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            {consultation ? "Waiting" : "Today's appointments"} ({upNext.length})
            {!consultation && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (auto-starts at scheduled time)
              </span>
            )}
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

      <ConsultationReportModal
        open={reportOpen}
        patientName={consultation?.patientName ?? ""}
        error={reportError}
        onClose={() => setReportOpen(false)}
        onSubmit={handleEndWithReport}
      />

      <FollowUpModal
        open={followUpOpen}
        appointmentId={consultation?.appointmentId ?? 0}
        patientName={consultation?.patientName ?? ""}
        onClose={() => {
          setFollowUpOpen(false);
          reload();
        }}
      />
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

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

function InfoSection({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent/50"
        onClick={onToggle}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 py-1.5 text-sm">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className={highlight ? "font-medium text-destructive" : ""}>{value}</span>
    </div>
  );
}

function QuickFact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
