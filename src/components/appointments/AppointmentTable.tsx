import { Calendar, Clock, MoreHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import type { Appointment } from "@/types/appointment";

type AppointmentTableProps = {
  appointments: Appointment[];
  onAction: (action: string, appointment: Appointment) => void;
  showPatient?: boolean;
  showDoctor?: boolean;
};

export function AppointmentTable({ appointments, onAction, showPatient = true, showDoctor = true }: AppointmentTableProps) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
        <Calendar className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">No appointments found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {showPatient && <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patient</th>}
              {showDoctor && <th className="px-4 py-3 text-left font-medium text-muted-foreground">Doctor</th>}
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Specialty</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date & Time</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr key={appt.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                {showPatient && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                        {appt.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-medium">{appt.patientName}</span>
                    </div>
                  </td>
                )}
                {showDoctor && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      {appt.doctorName}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 text-muted-foreground">{appt.specialty}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{appt.date}</span>
                    <Clock className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
                    <span>{appt.time}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><AppointmentStatusBadge status={appt.status} /></td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onAction("details", appt)}>View Details</DropdownMenuItem>
                      {appt.status === "pending" && (
                        <>
                          <DropdownMenuItem onClick={() => onAction("confirm", appt)}>Confirm</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction("reject", appt)} className="text-destructive">Reject</DropdownMenuItem>
                        </>
                      )}
                      {appt.status === "confirmed" && (
                        <>
                          <DropdownMenuItem onClick={() => onAction("complete", appt)}>Mark Completed</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction("reschedule", appt)}>Reschedule</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction("cancel", appt)} className="text-destructive">Cancel</DropdownMenuItem>
                        </>
                      )}
                      {(appt.status === "pending" || appt.status === "confirmed") && (
                        <DropdownMenuItem onClick={() => onAction("assign", appt)}>Assign Doctor</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
