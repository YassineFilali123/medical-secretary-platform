import { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SlotPicker, type SlotChoice } from "./SlotPicker";
import type { Appointment } from "@/types/appointment";

type RescheduleAppointmentModalProps = {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  /** Resolves true when the move succeeded, so the dialog only closes then. */
  onConfirm: (date: string, time: string) => Promise<boolean>;
  error?: string | null;
};

export function RescheduleAppointmentModal({
  open,
  appointment,
  onClose,
  onConfirm,
  error,
}: RescheduleAppointmentModalProps) {
  const [slot, setSlot] = useState<SlotChoice | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSlot(null);
  }, [open, appointment?.id]);

  if (!appointment) return null;

  const unchanged = slot?.date === appointment.date && slot?.time === appointment.time;

  const handleConfirm = async () => {
    if (!slot || unchanged) return;
    setSaving(true);
    const moved = await onConfirm(slot.date, slot.time);
    setSaving(false);
    if (moved) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10">
            <RefreshCw className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Reschedule Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Currently</p>
            <p className="text-sm font-medium">
              {appointment.doctorName} · {appointment.date} at {appointment.time}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Excluding this appointment stops it from clashing with itself, so
              its current time appears as an option rather than as taken. */}
          <SlotPicker
            doctorId={appointment.doctorId}
            excludeAppointmentId={appointment.id}
            value={slot}
            onChange={setSlot}
          />

          {unchanged && (
            <p className="text-center text-xs text-muted-foreground">
              That is the current time — pick a different slot.
            </p>
          )}

          {appointment.status === "confirmed" && (
            <p className="text-center text-xs text-muted-foreground">
              Moving a confirmed appointment sends it back to the doctor for approval.
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 rounded-xl">
              Keep current time
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!slot || unchanged || saving}
              className="flex-1 rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Moving…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-4 w-4" /> Reschedule
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
