import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Droplet,
  FileText,
  Loader2,
  Mail,
  Phone,
  ShieldAlert,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import { AppointmentStatusBadge } from "@/components/appointments";
import { initials, type DoctorPatientRecord } from "@/services/patients";
import { useDoctorPatientRecordQuery } from "@/hooks/queries/useDoctorQueries";
import { TYPE_LABELS } from "@/types/appointment";

type Tab = "overview" | "consultations" | "appointments";

export default function PatientDetailsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const [tab, setTab] = useState<Tab>("overview");

  const parsedId = Number(patientId);
  const validId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;

  const { data, isPending, error: queryError } = useDoctorPatientRecordQuery(validId);

  const record: DoctorPatientRecord | null = data ?? null;
  const loading = validId !== null && isPending;
  const error =
    validId === null
      ? "That is not a valid patient reference."
      : queryError instanceof Error
        ? queryError.message
        : queryError
          ? "Could not load this patient."
          : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground shadow-soft">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading patient…
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="space-y-4">
        <Link to="/doctor/patients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to patients
        </Link>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">{error ?? "Patient not found."}</p>
        </div>
      </div>
    );
  }

  const { patient, appointments, consultations } = record;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "consultations", label: "Consultation notes", count: consultations.length },
    { key: "appointments", label: "Appointments", count: appointments.length },
  ];

  return (
    <div className="space-y-6">
      <Link to="/doctor/patients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to patients
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {patient.avatarUrl ? (
              <img
                src={patient.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-primary text-xl font-semibold text-white">
                {initials(patient.name)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-semibold">{patient.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {patient.age !== null && <span>{patient.age} years old</span>}
                {patient.gender && <span>{patient.gender}</span>}
                {patient.dateOfBirth && <span>DOB: {patient.dateOfBirth}</span>}
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {patient.email}
                </span>
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {patient.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="shrink-0 rounded-xl bg-primary/5 px-4 py-2 text-center text-sm">
            <div className="text-xs text-muted-foreground">Last visit</div>
            <div className="font-medium">{patient.lastVisit ?? "—"}</div>
          </div>
        </div>

        {patient.allergies && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-medium">Allergies:</span> {patient.allergies}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count !== undefined && ` (${t.count})`}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Stethoscope className="h-4 w-4 text-primary" /> Medical details
            </h2>
            <dl className="space-y-2 text-sm">
              <Row icon={Droplet} label="Blood type" value={patient.bloodType} />
              <Row icon={TriangleAlert} label="Allergies" value={patient.allergies} />
              <Row icon={Phone} label="Emergency contact" value={patient.emergencyContact} />
              <Row icon={Calendar} label="Registered" value={patient.registeredAt} />
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Taken from the patient's own profile — update requests go through them.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Calendar className="h-4 w-4 text-primary" /> With you
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Completed visits" value={String(patient.completedVisits)} />
              <Row label="Total bookings" value={String(appointments.length)} />
              <Row label="Consultation notes" value={String(consultations.length)} />
            </dl>

            {upcoming(appointments).length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
                {upcoming(appointments).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {a.date} at {a.time}
                    </span>
                    <AppointmentStatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No upcoming appointments.</p>
            )}
          </div>
        </div>
      )}

      {tab === "consultations" && (
        <div className="space-y-3">
          {consultations.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">No consultation notes yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Notes you write when completing an appointment appear here.
              </p>
            </div>
          ) : (
            consultations.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-primary" /> {c.reason}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {c.date} · {c.time} · {TYPE_LABELS[c.type]}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm">{c.notes}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "appointments" && (
        <div className="space-y-2">
          {appointments.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
              <p className="text-sm text-muted-foreground">No appointment history.</p>
            </div>
          ) : (
            appointments.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.reason}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {a.date} · {a.time}–{a.endTime} · {TYPE_LABELS[a.type]}
                      </div>
                    </div>
                  </div>
                  <AppointmentStatusBadge status={a.status} />
                </div>
                {a.decisionReason && (
                  <p className="mt-2 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {a.status === "rejected" ? "Rejected" : "Cancelled"}: {a.decisionReason}
                  </p>
                )}
                {a.notes && (
                  <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium">Notes:</span> {a.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ElementType;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

function upcoming(appointments: DoctorPatientRecord["appointments"]) {
  const now = Date.now();
  return appointments
    .filter(
      (a) =>
        (a.status === "pending" || a.status === "confirmed") &&
        new Date(`${a.date}T${a.time}:00`).getTime() > now,
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}
