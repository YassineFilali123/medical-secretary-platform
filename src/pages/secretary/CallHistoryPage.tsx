import { useState, useMemo } from "react";
import { Search, Phone, PhoneIncoming, PhoneOutgoing, Voicemail, PhoneMissed, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { secretaryService } from "@/services/secretary";

const outcomeIcons: Record<string, React.ElementType> = {
  answered: Phone,
  missed: PhoneMissed,
  voicemail: Voicemail,
};

const outcomeColors: Record<string, string> = {
  answered: "text-green-600",
  missed: "text-destructive",
  voicemail: "text-amber-500",
};

const outcomeBg: Record<string, string> = {
  answered: "bg-green-50",
  missed: "bg-red-50",
  voicemail: "bg-amber-50",
};

function formatDuration(seconds: number): string {
  if (seconds === 0) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CallHistoryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const logs = useMemo(() => secretaryService.getCallLogs(), []);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchesSearch = l.patientName.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || l.outcome === filter || l.direction === filter;
      return matchesSearch && matchesFilter;
    });
  }, [logs, search, filter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Call History</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search calls..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="all">All Calls</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
          <option value="answered">Answered</option>
          <option value="missed">Missed</option>
          <option value="voicemail">Voicemail</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((l) => {
          const Icon = outcomeIcons[l.outcome] ?? Phone;
          return (
            <div key={l.id} className={`rounded-2xl border border-border p-4 shadow-soft transition-colors hover:bg-accent/50 ${outcomeBg[l.outcome]} bg-opacity-30`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl ${outcomeColors[l.outcome]} bg-background`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{l.patientName || "Unknown"}</span>
                      {l.direction === "inbound" ? (
                        <PhoneIncoming className="h-3 w-3 text-green-600" />
                      ) : (
                        <PhoneOutgoing className="h-3 w-3 text-blue-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="capitalize">{l.outcome}</span>
                      <span>&middot;</span>
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(l.duration)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{l.timestamp}</div>
              </div>
              {l.notes && <p className="mt-2 text-xs text-muted-foreground pl-13">{l.notes}</p>}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <Phone className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No calls found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
