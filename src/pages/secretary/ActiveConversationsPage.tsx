import { useMemo, useState } from "react";
import { Search, ArrowUpDown, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMonitoring } from "@/contexts/MonitoringContext";
import { ConversationRow, LiveIndicator } from "@/components/monitoring";
import type { ConversationStatus, Priority } from "@/types/monitoring";

const STATUS_OPTIONS: { value: ConversationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "waiting", label: "Waiting" },
  { value: "transferred", label: "Transferred" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS: { value: Priority | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "priority", label: "Priority" },
  { value: "waiting", label: "Waiting Time" },
] as const;

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default function ActiveConversationsPage() {
  const { conversations } = useMonitoring();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "priority" | "waiting">("newest");

  const filtered = useMemo(() => {
    let result = [...conversations];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.patientName.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.assignedAI.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") result = result.filter((c) => c.status === statusFilter);
    if (priorityFilter !== "all") result = result.filter((c) => c.priority === priorityFilter);

    result.sort((a, b) => {
      if (sort === "newest") return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      if (sort === "oldest") return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
      if (sort === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return b.waitingTime - a.waitingTime;
    });

    return result;
  }, [conversations, search, statusFilter, priorityFilter, sort]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Active Conversations</h1>
          <LiveIndicator label={`${filtered.length} active`} />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient, summary, or AI..."
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ConversationStatus | "all")}
          className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as Priority | "all")}
          className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No conversations match your filters.</p>
          </div>
        ) : (
          filtered.map((c) => <ConversationRow key={c.id} conversation={c} />)
        )}
      </div>
    </div>
  );
}
