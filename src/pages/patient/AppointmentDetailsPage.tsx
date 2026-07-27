import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Calendar, Clock, FileText, Loader2, Stethoscope, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appointmentService, canCancel, canReschedule } from "@/services/appointments";
import {
  AppointmentStatusBadge,
  CancelAppointmentModal,
  RescheduleAppointmentModal,
} from "@/components/appointments";
import { ROUTES } from "@/constants/routes";
import { TYPE_LABELS, type Appointment } from "@/types/appointment";

export default function AppointmentDetailsPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const load = useCallback(async () => {
    const id = Number(appointmentId);
    if (!Number.isInteger(id) || id <= 0) {
      setError("That is not a valid appointment reference.");
      setLoading(false);
      return;
    }

    try {
      setAppointment(await appointmentService.byId(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this appointment.");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: () => Promise<unknown>): Promise<boolean> => {
    setActionError(null);
    try {
      await action();
      await load();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "That action failed.");
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground shadow-soft">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading appointment…
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">{error ?? "Appointment not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Appointment Details</h1>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {actionError}
        </div>
      )}

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
            <InfoRow icon={Calendar} label="Date" value={formatDate(appointment.date)} />
            <InfoRow
              icon={Clock}
              label="Time"
              value={`${appointment.time}–${appointment.endTime} (${appointment.duration} min)`}
            />
            <InfoRow icon={FileText} label="Type" value={TYPE_LABELS[appointment.type]} />
            <InfoRow icon={FileText} label="Reason" value={appointment.reason} />
          </div>

          {appointment.decisionReason && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-xs font-medium text-destructive">
                {appointment.status === "rejected" ? "Reason for rejection" : "Reason for cancellation"}
              </p>
              <p className="mt-1 text-sm">{appointment.decisionReason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        {canReschedule(appointment, false) && (
          <Button variant="outline" className="rounded-xl" onClick={() => setRescheduleOpen(true)}>
            Reschedule
          </Button>
        )}
        {canCancel(appointment, false) && (
          <Button variant="destructive" className="rounded-xl" onClick={() => setCancelOpen(true)}>
            Cancel Appointment
          </Button>
        )}
        <Button variant="outline" className="rounded-xl" onClick={() => navigate(ROUTES.PATIENT_APPOINTMENTS)}>
          Back to Appointments
        </Button>
      </div>

      <CancelAppointmentModal
        open={cancelOpen}
        appointment={appointment}
        error={actionError}
        onClose={() => {
          setCancelOpen(false);
          setActionError(null);
        }}
        onConfirm={(reason) => runAction(() => appointmentService.cancel(appointment.id, reason))}
      />

      <RescheduleAppointmentModal
        open={rescheduleOpen}
        appointment={appointment}
        error={actionError}
        onClose={() => {
          setRescheduleOpen(false);
          setActionError(null);
        }}
        onConfirm={(date, time) => runAction(() => appointmentService.reschedule(appointment.id, date, time))}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
