import { useState } from "react";
import {
  CalendarClock,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Timer,
  AlertTriangle,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  type FollowUpType,
  type FollowUpPriority,
  PERIOD_PRESETS,
  followUpService,
} from "@/services/followup";

type Props = {
  open: boolean;
  appointmentId: number;
  patientName: string;
  onClose: () => void;
};

const PRIORITIES: { value: FollowUpPriority; label: string; icon: typeof Clock; color: string }[] = [
  { value: "routine", label: "Routine", icon: Clock, color: "text-blue-600 bg-blue-100" },
  { value: "recommended", label: "Recommended", icon: CalendarClock, color: "text-amber-600 bg-amber-100" },
  { value: "urgent", label: "Urgent", icon: AlertTriangle, color: "text-red-600 bg-red-100" },
];

export function FollowUpModal({ open, appointmentId, patientName, onClose }: Props) {
  const [type, setType] = useState<FollowUpType>("none");
  const [priority, setPriority] = useState<FollowUpPriority>("routine");
  const [periodDays, setPeriodDays] = useState(14);
  const [customDays, setCustomDays] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const handleSkip = async () => {
    setBusy(true);
    setError(null);
    try {
      await followUpService.create({ appointmentId, type: "none" });
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      const input: Parameters<typeof followUpService.create>[0] = {
        appointmentId,
        type,
        priority,
        note: note.trim() || undefined,
      };

      if (type === "period") {
        const days = customDays ? parseInt(customDays) : periodDays;
        if (!days || days < 1) {
          setError("Please select a valid period.");
          setBusy(false);
          return;
        }
        input.periodDays = days;
        const preset = PERIOD_PRESETS.find((p) => p.days === days);
        input.periodLabel = preset?.label || `Within ${days} days`;
      }

      await followUpService.create(input);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save follow-up.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-lg font-semibold">Follow-up Saved</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {type === "none"
              ? "No follow-up needed. Closing..."
              : "The patient has been notified."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
        {/* Header — no close button, mandatory step */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Follow-up Appointment</h2>
              <p className="text-xs text-muted-foreground">Patient: {patientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            <Lock className="h-3 w-3" /> Required
          </div>
        </div>

        {/* Mandatory notice */}
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          This step is mandatory. Please select a follow-up option to complete the consultation.
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="space-y-5 px-6 py-5">
          {/* Type Selection */}
          <div>
            <Label className="text-sm font-medium">Follow-up Type</Label>
            <div className="mt-2 space-y-2">
              <TypeOption
                selected={type === "none"}
                onClick={() => setType("none")}
                icon={XCircle}
                title="No Follow-up Needed"
                description="The patient does not need another appointment."
              />
              <TypeOption
                selected={type === "period"}
                onClick={() => setType("period")}
                icon={Timer}
                title="Recommend Follow-up Period"
                description="Let the patient choose a time within a recommended window."
              />
            </div>
          </div>

          {/* Period: Preset selection */}
          {type === "period" && (
            <>
              <div>
                <Label className="text-sm font-medium">Period</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PERIOD_PRESETS.map((p) => (
                    <button
                      key={p.days}
                      onClick={() => {
                        setPeriodDays(p.days);
                        setCustomDays("");
                      }}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                        periodDays === p.days && !customDays
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={customDays}
                      onChange={(e) => {
                        setCustomDays(e.target.value);
                        if (e.target.value) setPeriodDays(parseInt(e.target.value) || 1);
                      }}
                      placeholder="Custom"
                      className="h-8 w-20 rounded-xl border border-input bg-background px-2 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Priority */}
          {type !== "none" && (
            <div>
              <Label className="text-sm font-medium">Priority</Label>
              <div className="mt-2 flex gap-2">
                {PRIORITIES.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.value}
                      onClick={() => setPriority(p.value)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                        priority === p.value
                          ? `border-primary/30 ${p.color}`
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note */}
          {type !== "none" && (
            <div>
              <Label className="text-sm font-medium">
                Doctor's Note <span className="text-muted-foreground/60">(optional)</span>
              </Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for follow-up, special instructions..."
                className="mt-1 min-h-[60px] rounded-xl"
                maxLength={1000}
              />
            </div>
          )}

          {/* Actions — no Cancel button, mandatory */}
          <div className="flex justify-end pt-2">
            {type === "none" ? (
              <Button
                className="rounded-xl bg-gradient-primary"
                disabled={busy}
                onClick={handleSkip}
              >
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                Confirm: No Follow-up Needed
              </Button>
            ) : (
              <Button
                className="rounded-xl bg-gradient-primary"
                disabled={busy}
                onClick={handleSubmit}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-1 h-4 w-4" /> Save & Notify Patient
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TypeOption({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-all ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`grid h-8 w-8 place-items-center rounded-lg ${
            selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
    </button>
  );
}
