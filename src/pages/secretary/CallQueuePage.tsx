import { useState } from "react";
import { Phone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMonitoring } from "@/contexts/MonitoringContext";
import { CallQueueItemRow, LiveIndicator } from "@/components/monitoring";
import type { Priority } from "@/types/monitoring";

export default function CallQueuePage() {
  const { callQueue, removeCall } = useMonitoring();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");

  const filtered = callQueue
    .filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!c.patientName.toLowerCase().includes(q) && !c.reason.toLowerCase().includes(q)) return false;
      }
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return pOrder[a.priority] - pOrder[b.priority] || new Date(a.waitingSince).getTime() - new Date(b.waitingSince).getTime();
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Call Queue</h1>
          <LiveIndicator label={`${callQueue.length} waiting`} />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient or reason..."
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "critical", "high", "medium", "low"] as const).map((p) => {
            const count = p === "all" ? callQueue.length : callQueue.filter((c) => c.priority === p).length;
            return (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  priorityFilter === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <Phone className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">No calls in queue.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <CallQueueItemRow key={c.id} call={c} onRemove={removeCall} />
          ))}
        </div>
      )}
    </div>
  );
}
