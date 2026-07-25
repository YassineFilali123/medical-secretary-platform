import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, User, FileText, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appointmentService } from "@/services/appointments";
import { AppointmentStatusBadge, CancelAppointmentModal } from "@/components/appointments";
import { useState } from "react";

export default function AppointmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const appointment = useMemo(() => appointmentService.getAppointmentsByPatient("p1").find((a) => a.id === id) ?? null, [id]);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!appointment) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-xl"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">Appointment not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-semibold tracking-tight">Appointment Details</h1>
      </div>

      <Card className="border-border bg-card shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Appointment #{appointment.id}</CardTitle>
            <AppointmentStatusBadge status={appointment.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoRow icon={User} label="Doctor" value={appointment.doctorName} />
            <InfoRow icon={Stethoscope} label="Specialty" value={appointment.specialty} />
            <InfoRow icon={Calendar} label="Date" value={appointment.date} />
            <InfoRow icon={Clock} label="Time" value={appointment.time} />
            <InfoRow icon={FileText} label="Reason" value={appointment.reason} />
          </div>
          {appointment.notes && (
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm">{appointment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {(appointment.status === "pending" || appointment.status === "confirmed") && (
          <Button variant="destructive" className="rounded-xl" onClick={() => setCancelOpen(true)}>Cancel Appointment</Button>
        )}
        <Button variant="outline" className="rounded-xl" onClick={() => navigate("/patient/appointments")}>Back to Appointments</Button>
      </div>

      <CancelAppointmentModal open={cancelOpen} appointment={appointment} onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => { appointmentService.cancelAppointment(appointment.id, reason); navigate("/patient/appointments"); }} />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
