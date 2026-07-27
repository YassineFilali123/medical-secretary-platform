import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Loader2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Appointment } from "@/types/appointment";

const MAX_REASON = 255;

type CancelAppointmentModalProps = {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  /** Resolves true on success, so the dialog stays open if the API refuses. */
  onConfirm: (reason: string) => Promise<boolean>;
  /** "reject" is the doctor turning down a request they never agreed to. */
  mode?: "cancel" | "reject";
  error?: string | null;
};

const COPY = {
  cancel: {
    title: "Cancel Appointment",
    icon: AlertTriangle,
    confirm: "Cancel appointment",
    dismiss: "Keep appointment",
    hint: "The slot will be released for another patient.",
  },
  reject: {
    title: "Reject Request",
    icon: XCircle,
    confirm: "Reject request",
    dismiss: "Go back",
    hint: "The patient will see that you declined, along with any reason you give.",
  },
} as const;

export function CancelAppointmentModal({
  open,
  appointment,
  onClose,
  onConfirm,
  mode = "cancel",
  error,
}: CancelAppointmentModalProps) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const copy = COPY[mode];
  const Icon = copy.icon;

  useEffect(() => {
    if (open) setReason("");
  }, [open, appointment?.id]);

  const handleConfirm = async () => {
    setSaving(true);
    const done = await onConfirm(reason.trim());
    setSaving(false);
    if (done) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10">
            <Icon className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">{copy.title}</DialogTitle>
          <DialogDescription className="text-center">
            {appointment
              ? `${appointment.patientName} with ${appointment.doctorName} on ${appointment.date} at ${appointment.time}.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Reason (optional)</Label>
            <span className="text-[11px] text-muted-foreground">
              {reason.length}/{MAX_REASON}
            </span>
          </div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
            placeholder="Add a short explanation…"
            className="rounded-xl"
          />

          <p className="text-xs text-muted-foreground">{copy.hint}</p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 rounded-xl">
              {copy.dismiss}
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={saving} className="flex-1 rounded-xl">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {copy.confirm}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
