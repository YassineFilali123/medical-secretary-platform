import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle, UserCheck } from "lucide-react";
import { secretaryService } from "@/services/secretary";

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-amber-100 text-amber-700",
  medium: "bg-blue-100 text-blue-700",
};

const statusColors: Record<string, string> = {
  waiting: "bg-red-50 text-red-700 border-red-200",
  assigned: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
};

const DOCTORS = ["Dr. Chen", "Dr. Patel", "Dr. Garcia"];

export default function EmergencyCasesPage() {
  const [cases, setCases] = useState(() => secretaryService.getEmergencyCases());
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return cases;
    return cases.filter((e) => e.severity === filter);
  }, [cases, filter]);

  const handleAssign = (id: string, doctor: string) => {
    secretaryService.assignDoctorToEmergency(id, doctor);
    setCases(secretaryService.getEmergencyCases());
  };

  const handleResolve = (id: string) => {
    secretaryService.resolveEmergency(id);
    setCases(secretaryService.getEmergencyCases());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emergency Cases</h1>
          <p className="mt-1 text-sm text-muted-foreground">{cases.filter((e) => e.status !== "resolved").length} active cases</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all", "critical", "high", "medium"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((e) => (
          <div key={e.id} className={`rounded-2xl border-2 p-5 shadow-soft ${
            e.severity === "critical" ? "border-destructive/30 bg-destructive/5" : e.severity === "high" ? "border-amber-200 bg-amber-50/30" : "border-border bg-card"
          }`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`h-6 w-6 mt-0.5 ${
                  e.severity === "critical" ? "text-destructive" : e.severity === "high" ? "text-amber-500" : "text-blue-500"
                }`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{e.patientName || "Unknown Patient"}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${severityColors[e.severity]}`}>{e.severity}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusColors[e.status]}`}>{e.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{e.condition}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Arrived at {e.arrivedAt}
                    {e.assignedDoctor ? ` \u00b7 Assigned to ${e.assignedDoctor}` : ""}
                  </p>
                  {e.notes && <p className="mt-1 text-xs text-muted-foreground italic">Note: {e.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {e.status !== "resolved" && (
                  <>
                    <select
                      onChange={(ev) => handleAssign(e.id, ev.target.value)}
                      defaultValue=""
                      className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
                    >
                      <option value="" disabled>Assign doctor...</option>
                      {DOCTORS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button onClick={() => handleResolve(e.id)} className="rounded-lg bg-green-100 p-2 text-green-700 hover:bg-green-200">
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  </>
                )}
                {e.status === "assigned" && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <UserCheck className="h-4 w-4" /> {e.assignedDoctor}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No emergency cases.</p>
          </div>
        )}
      </div>
    </div>
  );
}
