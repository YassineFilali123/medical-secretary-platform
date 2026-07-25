import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Mail, Phone, Calendar, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { doctorService } from "@/services/doctor";

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const patients = useMemo(() => doctorService.getPatients(), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || p.condition.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
    );
  }, [patients, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
        <p className="mt-1 text-sm text-muted-foreground">{patients.length} total patients</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, condition, or email..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Link key={p.id} to={`/doctor/patients/${p.id}`} className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-white">
                {p.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.condition}</div>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {p.email}</div>
              <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {p.phone}</div>
              <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /> Last visit: {p.lastVisit}</div>
            </div>
            {p.upcomingAppointment && (
              <div className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
                Upcoming: {p.upcomingAppointment}
              </div>
            )}
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              View profile <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">No patients found matching your search.</p>
        </div>
      )}
    </div>
  );
}
