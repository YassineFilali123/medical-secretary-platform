import { Calendar, Clock, Stethoscope, User } from "lucide-react";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import { TYPE_LABELS, type Appointment } from "@/types/appointment";

type AppointmentCardProps = {
  appointment: Appointment;
  actions?: React.ReactNode;
  /**
   * Whose name to lead with. A patient's own list should be headed by the
   * doctor; a doctor's or the front desk's list by the patient.
   */
  headline?: "patient" | "doctor";
};

export function AppointmentCard({ appointment, actions, headline = "patient" }: AppointmentCardProps) {
  const title = headline === "doctor" ? appointment.doctorName : appointment.patientName;
  const SubIcon = headline === "doctor" ? Stethoscope : User;
  const subtitle = headline === "doctor" ? appointment.specialty : appointment.doctorName;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-sm font-semibold text-white">
            {initials(title)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{title}</h3>
              <AppointmentStatusBadge status={appointment.status} />
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {TYPE_LABELS[appointment.type]}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{appointment.reason}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <SubIcon className="h-3 w-3" />
                {subtitle}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(appointment.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {appointment.time}–{appointment.endTime}
              </span>
            </div>
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>

      {appointment.decisionReason && (
        <p className="mt-3 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {appointment.status === "rejected" ? "Rejected" : "Cancelled"}: {appointment.decisionReason}
        </p>
      )}

      {appointment.notes && (
        <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium">Notes:</span> {appointment.notes}
        </p>
      )}
    </div>
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
    month: "short",
    day: "numeric",
  });
}
