import { Calendar, Clock, User } from "lucide-react";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import type { Appointment } from "@/types/appointment";

type AppointmentCardProps = {
  appointment: Appointment;
  actions?: React.ReactNode;
};

export function AppointmentCard({ appointment, actions }: AppointmentCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-colors hover:shadow-elevated">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-white text-sm font-semibold">
            {appointment.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">{appointment.patientName}</h3>
              <AppointmentStatusBadge status={appointment.status} />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{appointment.reason}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {appointment.doctorName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {appointment.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {appointment.time} ({appointment.duration} min)
              </span>
            </div>
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {appointment.notes && (
        <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{appointment.notes}</p>
      )}
    </div>
  );
}
