import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, FileText, Pill, Stethoscope, ChevronRight } from "lucide-react";
import { doctorService } from "@/services/doctor";

type Tab = "overview" | "history" | "appointments" | "documents";

export default function PatientDetailsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const patient = useMemo(() => doctorService.getPatientById(patientId ?? ""), [patientId]);
  const records = useMemo(() => doctorService.getPatientRecords(patientId ?? ""), [patientId]);
  const appointments = useMemo(() => doctorService.getPatientAppointments(patientId ?? ""), [patientId]);

  if (!patient) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
        <p className="text-muted-foreground">Patient not found.</p>
        <Link to="/doctor/patients" className="mt-2 inline-flex text-sm font-medium text-primary hover:underline">Back to patients</Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "history", label: "Medical History" },
    { key: "appointments", label: "Appointments" },
    { key: "documents", label: "Documents" },
  ];

  return (
    <div className="space-y-6">
      <Link to="/doctor/patients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to patients
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-xl font-semibold text-white">
              {patient.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{patient.name}</h1>
              <p className="text-sm text-muted-foreground">{patient.condition}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{patient.gender}</span>
                <span>&middot;</span>
                <span>DOB: {patient.dateOfBirth}</span>
                <span>&middot;</span>
                <span>{patient.email}</span>
                <span>&middot;</span>
                <span>{patient.phone}</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-primary/5 px-4 py-2 text-center text-sm">
            <div className="text-xs text-muted-foreground">Last visit</div>
            <div className="font-medium">{patient.lastVisit}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" /> Medical Summary</h2>
            <p className="text-sm">Primary Condition: <span className="font-medium">{patient.condition}</span></p>
            {records.length > 0 && (
              <div className="mt-3 space-y-2">
                {records.slice(0, 2).map((r) => (
                  <div key={r.id} className="rounded-xl border border-border p-3 text-sm">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{r.date}</span>
                      <span className="font-medium text-foreground">{r.diagnosis}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Upcoming</h2>
            {patient.upcomingAppointment ? (
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /> {patient.upcomingAppointment}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-3">
          {records.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
              <p className="text-sm text-muted-foreground">No medical records found.</p>
            </div>
          ) : (
            records.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4 text-primary" /> {r.diagnosis}</div>
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div><span className="font-medium">Prescription:</span> <span className="text-muted-foreground">{r.prescription}</span></div>
                  <div><span className="font-medium">Notes:</span> <span className="text-muted-foreground">{r.notes}</span></div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                  <Pill className="h-3 w-3" /> Renew prescription
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="space-y-2">
          {appointments.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
              <p className="text-sm text-muted-foreground">No appointment history.</p>
            </div>
          ) : (
            appointments.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{a.reason}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {a.date} at {a.time} &middot; {a.duration}min
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    a.status === "completed" ? "bg-green-100 text-green-700" : a.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                  }`}>{a.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "documents" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {records.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" /> Medical Report
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{r.date} &middot; {r.diagnosis}</p>
              <button className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <ChevronRight className="h-3 w-3" /> Download PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
