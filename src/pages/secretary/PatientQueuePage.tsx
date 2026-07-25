import { useState, useMemo } from "react";
import { Search, Clock, AlertTriangle, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { secretaryService } from "@/services/secretary";

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

const priorityOrder = { high: 0, medium: 1, low: 2 };

export default function PatientQueuePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const queue = useMemo(() => secretaryService.getQueue(), []);

  const sorted = useMemo(() => {
    return [...queue]
      .filter((p) => {
        const matchesSearch = p.patientName.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "all" || p.priority === filter;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [queue, search, filter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Patient Queue</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search patients..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="border-b border-border px-5 py-3">
          <div className="text-sm text-muted-foreground">
            {sorted.length} patient{sorted.length !== 1 ? "s" : ""} in queue
          </div>
        </div>
        <div className="divide-y divide-border">
          {sorted.map((p, i) => (
            <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{p.patientName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[p.priority]}`}>{p.priority}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{p.reason}</span>
                  <span>&middot;</span>
                  <span>Arrived at {p.arrivedAt}</span>
                  {p.doctorName && <><span>&middot;</span><span>{p.doctorName}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-amber-600">{p.estimatedWait} min</span>
              </div>
              <div className="flex items-center gap-1">
                <button aria-label="View patient details" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-accent">
                  <User className="h-4 w-4" />
                </button>
                {p.priority === "high" && <AlertTriangle className="h-4 w-4 text-destructive" />}
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">No patients in queue.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
