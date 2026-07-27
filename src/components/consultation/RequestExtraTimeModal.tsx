import { useEffect, useState } from "react";
import { AlertCircle, Clock, Loader2, Siren } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MAX_EXTENSION,
  MIN_EXTENSION,
  PRESET_MINUTES,
  REASON_LABELS,
  type Consultation,
  type ReasonCategory,
} from "@/services/consultation";

const MAX_REASON = 500;

type RequestExtraTimeModalProps = {
  open: boolean;
  consultation: Consultation | null;
  onClose: () => void;
  onSubmit: (input: {
    minutes: number;
    reasonCategory: ReasonCategory;
    reason?: string;
    isEmergency: boolean;
  }) => Promise<boolean>;
  error?: string | null;
};

export function RequestExtraTimeModal({
  open,
  consultation,
  onClose,
  onSubmit,
  error,
}: RequestExtraTimeModalProps) {
  const [preset, setPreset] = useState<number | "custom">(PRESET_MINUTES[0]);
  const [custom, setCustom] = useState("20");
  const [category, setCategory] = useState<ReasonCategory>("patient_explanation");
  const [reason, setReason] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPreset(PRESET_MINUTES[0]);
    setCustom("20");
    setCategory("patient_explanation");
    setReason("");
    setIsEmergency(false);
    setSaving(false);
  }, [open]);

  // Picking "Emergency case" as the category is the same statement as ticking
  // the box; keep them in step rather than letting them contradict each other.
  useEffect(() => {
    if (category === "emergency") setIsEmergency(true);
  }, [category]);

  const minutes = preset === "custom" ? Number(custom) : preset;
  const minutesValid = Number.isInteger(minutes) && minutes >= MIN_EXTENSION && minutes <= MAX_EXTENSION;

  const handleSubmit = async () => {
    if (!minutesValid) return;
    setSaving(true);
    const done = await onSubmit({
      minutes,
      reasonCategory: category,
      reason: reason.trim() || undefined,
      isEmergency,
    });
    setSaving(false);
    if (done) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Request Extra Time</DialogTitle>
          <DialogDescription className="text-center">
            {consultation
              ? `${consultation.patientName} · scheduled to end at ${consultation.endTime}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <Label>How much longer?</Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {PRESET_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPreset(m)}
                  className={`rounded-xl border p-3 text-sm font-medium transition-colors ${
                    preset === m
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  +{m}
                  <span className="block text-[10px] font-normal text-muted-foreground">min</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPreset("custom")}
                className={`rounded-xl border p-3 text-sm font-medium transition-colors ${
                  preset === "custom"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                Custom
              </button>
            </div>

            {preset === "custom" && (
              <div className="mt-2">
                <Input
                  type="number"
                  min={MIN_EXTENSION}
                  max={MAX_EXTENSION}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="Minutes"
                />
                {!minutesValid && (
                  <p className="mt-1 text-xs text-destructive">
                    Enter a whole number between {MIN_EXTENSION} and {MAX_EXTENSION}.
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <Label>Reason</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ReasonCategory)}>
              <SelectTrigger className="mt-2 h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REASON_LABELS) as ReasonCategory[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {REASON_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Note (optional)</Label>
              <span className="text-[11px] text-muted-foreground">
                {reason.length}/{MAX_REASON}
              </span>
            </div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
              placeholder="Anything the front desk should know…"
              className="mt-2 rounded-xl"
            />
          </div>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
              isEmergency ? "border-destructive bg-destructive/5" : "border-border hover:bg-accent"
            }`}
          >
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
            />
            <span className="text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <Siren className={`h-3.5 w-3.5 ${isEmergency ? "text-destructive" : ""}`} /> Emergency
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Applies immediately without waiting for the front desk. Later patients are moved back
                and told you are handling an emergency.
              </span>
            </span>
          </label>

          <p className="text-xs text-muted-foreground">
            If this fits before your next patient it is approved automatically. If it would delay
            somebody, the front desk is asked first.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!minutesValid || saving}
              className={`flex-1 rounded-xl ${isEmergency ? "bg-destructive hover:bg-destructive/90" : ""}`}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Requesting…
                </>
              ) : (
                <>Request +{minutesValid ? minutes : "?"} min</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
