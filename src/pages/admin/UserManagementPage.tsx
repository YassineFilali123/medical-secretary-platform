import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Loader2,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useDebounced } from "@/hooks/useDebounced";
import { ROLE_BADGE_CLASS } from "@/constants/roles";
import {
  USER_ROLES,
  type AdminUserRole,
  type AdminUserRow,
} from "@/services/admin-users";
import {
  useAdminUsersQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
  useSetUserStatusMutation,
  useUpdateUserMutation,
} from "@/hooks/queries/useAdminQueries";

type FormState = {
  name: string;
  email: string;
  password: string;
  role: AdminUserRole;
  status: "active" | "inactive";
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  role: "patient",
  status: "active",
};

/** "2026-08-11 19:00:03" → "2026-08-11" */
function dateOnly(value: string | null): string {
  return value ? value.slice(0, 10) : "—";
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounced(search, 300);

  const [error, setError] = useState<string | null>(null);

  // Mutations invalidate the user list and the statistics head counts, so the
  // table and every dashboard tile refresh together after a write.
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const setUserStatus = useSetUserStatusMutation();
  const deleteUser = useDeleteUserMutation();

  // Dialog state
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Filtering and paging are done by the server, so an admin's browser only
  // ever holds the page it is allowed to see. The filters are part of the query
  // key, so changing one refetches and caches that combination separately.
  const {
    data,
    isPending: loading,
    error: queryError,
    refetch,
  } = useAdminUsersQuery({ q: debouncedSearch, role: roleFilter, status: statusFilter, page });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;

  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const listError =
    error ?? (queryError instanceof Error ? queryError.message : queryError ? "Could not load users." : null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isSelf = (u: AdminUserRow) => String(u.id) === String(currentUser?.id ?? "");

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreating(true);
  };

  const openEdit = (u: AdminUserRow) => {
    setForm({ name: u.name, email: u.email, password: "", role: u.role, status: u.status });
    setFormError(null);
    setEditing(u);
  };

  const closeDialogs = () => {
    setCreating(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (creating) {
        await createUser.mutateAsync({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          status: form.status,
        });
      } else if (editing) {
        await updateUser.mutateAsync({
          id: editing.id,
          name: form.name,
          email: form.email,
          role: form.role,
          status: form.status,
          password: form.password,
        });
      }
      closeDialogs();
      reload();
    } catch (err: unknown) {
      // The server owns the rules (last admin, self-demotion, duplicate email);
      // its message is shown verbatim rather than second-guessed here.
      setFormError(err instanceof Error ? err.message : "Could not save the user.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (u: AdminUserRow) => {
    setBusyId(u.id);
    setError(null);
    try {
      await setUserStatus.mutateAsync({ id: u.id, status: u.status === "active" ? "inactive" : "active" });
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not change the user's status.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setError(null);
    try {
      await deleteUser.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete the user.");
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  const dialogOpen = creating || editing !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${total} ${total === 1 ? "user" : "users"}`}
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-xl bg-gradient-primary gap-1.5">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {listError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {listError}
          </span>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={reload}>
            Retry
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Roles</option>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Login</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No users match these filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-medium">{u.name}</span>
                        {isSelf(u) && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            you
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${ROLE_BADGE_CLASS[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          u.status === "active" ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            u.status === "active" ? "bg-green-500" : "bg-red-400"
                          }`}
                        />
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{dateOnly(u.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.lastLoginAt ? u.lastLoginAt.slice(0, 16) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/users/${u.id}`}
                          aria-label={`View ${u.name}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => openEdit(u)}
                          aria-label={`Edit ${u.name}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {/* Disabled for your own account: the server refuses it
                            anyway, so the button would only ever show an error. */}
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isSelf(u) || busyId === u.id}
                          aria-label={u.status === "active" ? `Deactivate ${u.name}` : `Activate ${u.name}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-40"
                        >
                          {u.status === "active" ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          disabled={isSelf(u) || busyId === u.id}
                          aria-label={`Delete ${u.name}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {total === 0
            ? "No users"
            : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Previous page"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Create / Edit */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{creating ? "Add User" : "Edit User"}</DialogTitle>
            <DialogDescription>
              {creating
                ? "Accounts created here skip email verification and can sign in immediately."
                : "Leave the password blank to keep the current one."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="user-name">Full Name</Label>
              <Input
                id="user-name"
                className="h-10 rounded-xl"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                className="h-10 rounded-xl"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-password">
                Password {creating ? "" : <span className="text-muted-foreground">(optional)</span>}
              </Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                placeholder={creating ? "At least 6 characters" : "Leave blank to keep current"}
                className="h-10 rounded-xl"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="user-role">Role</Label>
                <select
                  id="user-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminUserRole }))}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-status">Status</Label>
                <select
                  id="user-status"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as "active" | "inactive" }))
                  }
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={closeDialogs} disabled={saving}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-gradient-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {creating ? "Create User" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `${deleteTarget.name} will no longer be able to sign in. Their appointments and medical records are kept.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteTarget(null)}
              disabled={busyId !== null}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={busyId !== null}
            >
              {busyId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
