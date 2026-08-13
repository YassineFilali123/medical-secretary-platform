import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Calendar, Clock, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_BADGE_CLASS } from "@/constants/roles";
import {
  adminUserService,
  USER_ROLES,
  type AdminUserDetail,
  type AdminUserRole,
} from "@/services/admin-users";

export default function UserDetailsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [form, setForm] = useState({ name: "", email: "", role: "patient" as AdminUserRole });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const id = Number(userId);
  const isSelf = user !== null && String(user.id) === String(currentUser?.id ?? "");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (!userId || !Number.isInteger(id) || id <= 0) {
      setError("Invalid user reference.");
      setLoading(false);
      return;
    }

    adminUserService
      .detail(id)
      .then((data) => {
        if (cancelled) return;
        setUser(data);
        setForm({ name: data.name, email: data.email, role: data.role });
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load this user.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, id, reloadKey]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    try {
      await adminUserService.update({
        id: user.id,
        name: form.name,
        email: form.email,
        role: form.role,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Could not save the user.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    try {
      await adminUserService.setStatus(user.id, user.status === "active" ? "inactive" : "active");
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Could not change the user's status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading user…
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{error ?? "User not found."}</p>
          <Link
            to="/admin/users"
            className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Back to users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin/users")}
          aria-label="Back to users"
          className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">User Details</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-primary text-2xl font-semibold text-white shrink-0">
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{user.name}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${ROLE_BADGE_CLASS[user.role]}`}>
                {user.role}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium ${
                  user.status === "active" ? "text-green-600" : "text-red-500"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    user.status === "active" ? "bg-green-500" : "bg-red-400"
                  }`}
                />
                {user.status}
              </span>
              {user.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" /> verified
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {user.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Joined {user.createdAt.slice(0, 10)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last login{" "}
                {user.lastLoginAt ? user.lastLoginAt.slice(0, 16) : "never"}
              </span>
            </div>
            {(user.profile.phone || user.profile.specialty || user.profile.department) && (
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {user.profile.phone && <span>Phone: {user.profile.phone}</span>}
                {user.profile.specialty && <span>Specialty: {user.profile.specialty}</span>}
                {user.profile.department && <span>Department: {user.profile.department}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="mb-4 text-base font-semibold">Edit User</h2>

        {saveError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {saveError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="detail-name">Full Name</Label>
            <Input
              id="detail-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="detail-email">Email</Label>
            <Input
              id="detail-email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="detail-role">Role</Label>
            <select
              id="detail-role"
              value={form.role}
              disabled={isSelf}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminUserRole }))}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.toUpperCase()}
                </option>
              ))}
            </select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">You cannot change your own role.</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-gradient-primary">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saved ? "Saved!" : "Save Changes"}
          </Button>
          <Button
            variant="outline"
            onClick={handleToggleStatus}
            disabled={saving || isSelf}
            className="rounded-xl text-destructive border-destructive disabled:opacity-50"
          >
            {user.status === "active" ? "Deactivate User" : "Activate User"}
          </Button>
        </div>
      </div>
    </div>
  );
}
