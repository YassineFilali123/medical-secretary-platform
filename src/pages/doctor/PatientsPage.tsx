import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Calendar, Droplet, Loader2, Mail, Phone, Search, TriangleAlert, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounced } from "@/hooks/useDebounced";
import { doctorPatientService, initials, type DoctorPatient } from "@/services/patients";

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);

  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    doctorPatientService
      .list(debouncedSearch)
      .then((data) => {
        if (cancelled) return;
        setPatients(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load your patients.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, reloadKey]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Loading…" : `${patients.length} ${patients.length === 1 ? "patient" : "patients"} under your care`}
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </Button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          className="h-10 rounded-xl pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {loading && search !== debouncedSearch && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {loading && patients.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground shadow-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading patients…
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            {search.trim()
              ? "No patients match your search."
              : "No patients yet. A patient joins this list as soon as they book with you."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((p) => (
            <Link
              key={p.id}
              to={`/doctor/patients/${p.id}`}
              className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-elevated"
            >
              <div className="flex items-center gap-3">
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-white">
                    {initials(p.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[p.age !== null ? `${p.age} yrs` : null, p.gender].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{p.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 shrink-0" /> {p.phone ?? "No phone on file"}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {p.lastVisit ? `Last visit: ${p.lastVisit}` : "No completed visits yet"}
                </div>
                {p.bloodType && (
                  <div className="flex items-center gap-2">
                    <Droplet className="h-3 w-3 shrink-0" /> Blood type: {p.bloodType}
                  </div>
                )}
              </div>

              {p.allergies && (
                <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="line-clamp-2">Allergies: {p.allergies}</span>
                </div>
              )}

              {p.nextAppointment && (
                <div className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
                  Next: {p.nextAppointment.date} at {p.nextAppointment.time}
                  {p.nextAppointment.status === "pending" && " (awaiting your response)"}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {p.completedVisits} visit{p.completedVisits === 1 ? "" : "s"} · {p.totalAppointments} booking
                  {p.totalAppointments === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  View <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
