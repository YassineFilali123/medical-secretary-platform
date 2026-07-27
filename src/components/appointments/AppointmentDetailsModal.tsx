import { Calendar, Clock, FileText, Stethoscope, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import { TYPE_LABELS, type Appointment } from "@/types/appointment";

type AppointmentDetailsModalProps = {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
};

export function AppointmentDetailsModal({ open, appointment, onClose }: AppointmentDetailsModalProps) {
  if (!appointment) return null;

  const decisionLabel = appointment.status === "rejected" ? "Reason for rejection" : "Reason for cancellation";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-primary text-sm font-semibold text-white">
              {initials(appointment.patientName)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold">{appointment.patientName}</h3>
              <p className="text-xs text-muted-foreground">{TYPE_LABELS[appointment.type]}</p>
            </div>
            <div className="ml-auto shrink-0">
              <AppointmentStatusBadge status={appointment.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3 w-3" /> Doctor
              </div>
              <p className="mt-1 text-sm font-medium">{appointment.doctorName}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Stethoscope className="h-3 w-3" /> {appointment.specialty}
              </p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" /> Date &amp; time
              </div>
              <p className="mt-1 text-sm font-medium">{formatDate(appointment.date)}</p>
              <p className="text-xs text-muted-foreground">
                {appointment.time}–{appointment.endTime} ({appointment.duration} min)
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" /> Reason for visit
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{appointment.reason}</p>
          </div>

          {appointment.decisionReason && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-medium text-destructive">{decisionLabel}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{appointment.decisionReason}</p>
            </div>
          )}

          {/* Null for patients — the API withholds clinical notes from them. */}
          {appointment.notes && (
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" /> Consultation notes
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{appointment.notes}</p>
            </div>
          )}

          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> Booked on
            </div>
            <p className="mt-1 text-sm">{formatDate(appointment.createdAt)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
