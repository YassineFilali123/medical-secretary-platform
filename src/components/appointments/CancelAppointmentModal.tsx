import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Appointment } from "@/types/appointment";

type CancelAppointmentModalProps = {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function CancelAppointmentModal({ open, appointment, onClose, onConfirm }: CancelAppointmentModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Cancel Appointment</DialogTitle>
          <DialogDescription className="text-center">
            Are you sure you want to cancel this appointment with {appointment?.doctorName} on {appointment?.date} at {appointment?.time}?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Reason (optional)</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide a reason for cancellation..." className="rounded-xl" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Keep Appointment</Button>
            <Button variant="destructive" onClick={handleConfirm} className="flex-1 rounded-xl">Cancel Appointment</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
