import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { patientService } from "@/services/patient";
import { Button } from "@/components/ui/button";

export default function AppointmentDetailsPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const appt = useMemo(() => patientService.getAppointmentById(appointmentId ?? ""), [appointmentId]);

  if (!appt) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
        <p className="text-muted-foreground">Appointment not found.</p>
        <Link to="/patient/appointments" className="mt-2 inline-flex text-sm font-medium text-primary hover:underline">Back to appointments</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link to="/patient/appointments" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to appointments
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-white">
              {appt.doctorName.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <h1 className="text-lg font-semibold">{appt.doctorName}</h1>
              <p className="text-sm text-muted-foreground">{appt.doctorSpecialty}</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            appt.status === "upcoming" ? "bg-blue-100 text-blue-700" : appt.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>{appt.status}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Date</div>
              <div className="text-sm font-medium">{appt.date}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Time</div>
              <div className="text-sm font-medium">{appt.time}</div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-medium mb-1">Reason for visit</h3>
          <p className="text-sm text-muted-foreground">{appt.reason}</p>
        </div>

        {appt.notes && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-1">Doctor&apos;s Notes</h3>
            <div className="rounded-xl bg-primary/5 p-3 text-sm text-muted-foreground">{appt.notes}</div>
          </div>
        )}

        {appt.status === "upcoming" && (
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="rounded-xl">Reschedule</Button>
            <Button variant="outline" className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10">Cancel Appointment</Button>
          </div>
        )}
      </div>
    </div>
  );
}
