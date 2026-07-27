import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Appointment } from "@/types/appointment";

const MAX_NOTES = 2000;

type CompleteAppointmentModalProps = {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  /** Resolves true on success. */
  onConfirm: (notes: string) => Promise<boolean>;
  error?: string | null;
};

/**
 * Closing out a visit. The notes captured here are clinical and stay with the
 * clinic — the API does not return them to the patient.
 */
export function CompleteAppointmentModal({
  open,
  appointment,
  onClose,
  onConfirm,
  error,
}: CompleteAppointmentModalProps) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setNotes(appointment?.notes ?? "");
  }, [open, appointment?.id, appointment?.notes]);

  const handleConfirm = async () => {
    setSaving(true);
    const done = await onConfirm(notes.trim());
    setSaving(false);
    if (done) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Complete Appointment</DialogTitle>
          <DialogDescription className="text-center">
            {appointment
              ? `${appointment.patientName} · ${appointment.date} at ${appointment.time}`
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

          {appointment && (
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Reason for visit</p>
              <p className="mt-0.5 text-sm">{appointment.reason}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Consultation notes (optional)</Label>
            <span className="text-[11px] text-muted-foreground">
              {notes.length}/{MAX_NOTES}
            </span>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES))}
            placeholder="Findings, prescriptions, follow-up…"
            className="min-h-[120px] rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            Visible to clinic staff only — the patient does not see these notes.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={saving} className="flex-1 rounded-xl">
              {saving ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <CheckCircle className="mr-1 h-4 w-4" /> Mark completed
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
