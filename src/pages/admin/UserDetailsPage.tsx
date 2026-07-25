import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Calendar, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";
import type { AdminUser } from "@/types/admin";

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  doctor: "bg-blue-100 text-blue-700",
  secretary: "bg-amber-100 text-amber-700",
  patient: "bg-green-100 text-green-700",
};

export default function UserDetailsPage() {
  const { userId } = useParams();
  const user = adminService.getUserById(userId ?? "");
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", role: user?.role ?? "patient" });
  const [saved, setSaved] = useState(false);

  if (!user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">User not found.</p>
          <Link to="/admin/users" className="mt-2 inline-flex text-sm font-medium text-primary hover:underline">Back to users</Link>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/users" className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">User Details</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-primary text-2xl font-semibold text-white shrink-0">
            {user.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{user.name}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${roleColors[user.role]}`}>{user.role}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${user.status === "active" ? "text-green-600" : "text-red-500"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-red-400"}`} />
                {user.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined {user.createdAt}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Last login {user.lastLogin}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="mb-4 text-base font-semibold">Edit User</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminUser["role"] }))} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="secretary">Secretary</option>
              <option value="patient">Patient</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={handleSave} className="rounded-xl bg-gradient-primary">{saved ? "Saved!" : "Save Changes"}</Button>
          <Button variant="outline" className="rounded-xl text-destructive border-destructive">Deactivate User</Button>
        </div>
      </div>
    </div>
  );
}
