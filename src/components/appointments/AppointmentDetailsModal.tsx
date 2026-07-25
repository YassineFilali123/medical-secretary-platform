import { Calendar, Clock, FileText, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import type { Appointment } from "@/types/appointment";

type AppointmentDetailsModalProps = {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
};

export function AppointmentDetailsModal({ open, appointment, onClose }: AppointmentDetailsModalProps) {
  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-white text-sm font-semibold">
              {appointment.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <h3 className="text-base font-semibold">{appointment.patientName}</h3>
              <p className="text-xs text-muted-foreground">Patient ID: {appointment.patientId}</p>
            </div>
            <div className="ml-auto">
              <AppointmentStatusBadge status={appointment.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3 w-3" /> Doctor</div>
              <p className="mt-1 text-sm font-medium">{appointment.doctorName}</p>
              <p className="text-xs text-muted-foreground">{appointment.specialty}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> Date & Time</div>
              <p className="mt-1 text-sm font-medium">{appointment.date}</p>
              <p className="text-xs text-muted-foreground">{appointment.time} ({appointment.duration} min)</p>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="h-3 w-3" /> Reason</div>
            <p className="mt-1 text-sm">{appointment.reason}</p>
          </div>

          {appointment.notes && (
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="h-3 w-3" /> Notes</div>
              <p className="mt-1 text-sm text-muted-foreground">{appointment.notes}</p>
            </div>
          )}

          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Created</div>
            <p className="mt-1 text-sm">{appointment.createdAt}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
