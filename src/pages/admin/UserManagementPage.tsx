import { useState, useMemo } from "react";
import { Search, Plus, Edit3, Trash2, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  doctor: "bg-blue-100 text-blue-700",
  secretary: "bg-amber-100 text-amber-700",
  patient: "bg-green-100 text-green-700",
};

const PAGE_SIZE = 5;

export default function UserManagementPage() {
  const [users] = useState(() => adminService.getUsers());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <Button className="rounded-xl bg-gradient-primary gap-1.5">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or email..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="doctor">Doctor</option>
          <option value="secretary">Secretary</option>
          <option value="patient">Patient</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Login</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((u) => (
                <tr key={u.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {u.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${roleColors[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.status === "active" ? "text-green-600" : "text-red-500"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.status === "active" ? "bg-green-500" : "bg-red-400"}`} />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.lastLogin}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                        {u.status === "active" ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
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
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent disabled:opacity-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-medium ${page === p ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent disabled:opacity-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
