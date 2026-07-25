import { useState, useMemo } from "react";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";

const PAGE_SIZE = 8;

export default function ActivityLogsPage() {
  const [logs] = useState(() => adminService.getActivityLogs());
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchesSearch = l.user.toLowerCase().includes(search.toLowerCase()) || l.details.toLowerCase().includes(search.toLowerCase());
      const matchesAction = actionFilter === "all" || l.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const actionColors: Record<string, string> = {
    login: "bg-blue-100 text-blue-700",
    create: "bg-green-100 text-green-700",
    update: "bg-amber-100 text-amber-700",
    delete: "bg-red-100 text-red-700",
    view: "bg-purple-100 text-purple-700",
    complete: "bg-teal-100 text-teal-700",
    escalation: "bg-orange-100 text-orange-700",
    backup: "bg-gray-100 text-gray-600",
    alert: "bg-red-100 text-red-700",
    register: "bg-green-100 text-green-700",
    resolve: "bg-teal-100 text-teal-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Activity Logs</h1>
        <Button variant="outline" className="rounded-xl gap-1.5">
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by user or details..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="all">All Actions</option>
          <option value="login">Login</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="view">View</option>
          <option value="complete">Complete</option>
          <option value="escalation">Escalation</option>
          <option value="alert">Alert</option>
          <option value="backup">Backup</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Resource</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((l) => (
                <tr key={l.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {l.user.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-medium text-xs">{l.user}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${actionColors[l.action] ?? "bg-gray-100 text-gray-600"}`}>{l.action}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.resource}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[250px] truncate">{l.details}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground text-right whitespace-nowrap">{l.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page" className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent disabled:opacity-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-medium ${page === p ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page" className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent disabled:opacity-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
