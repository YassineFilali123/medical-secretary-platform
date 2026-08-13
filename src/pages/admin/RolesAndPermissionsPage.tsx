import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Info,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDebounced } from "@/hooks/useDebounced";
import { ROLE_DEFINITIONS, roleDefinition } from "@/constants/roles";
import {
  adminUserService,
  type AdminUserRole,
  type AdminUserRow,
  type RoleSummary,
} from "@/services/admin-users";

export default function RolesAndPermissionsPage() {
  const { user: currentUser } = useAuth();

  const [selectedRole, setSelectedRole] = useState<AdminUserRole>("patient");
  const [summary, setSummary] = useState<RoleSummary[]>([]);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [members, setMembers] = useState<AdminUserRow[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Counts come from the server, computed from user.roles itself.
  useEffect(() => {
    let cancelled = false;
    setLoadingSummary(true);

    adminUserService
      .roleSummary()
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setSummaryError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSummaryError(err instanceof Error ? err.message : "Could not load role counts.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSummary(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Members of the selected role, filtered server-side.
  useEffect(() => {
    let cancelled = false;
    setLoadingMembers(true);

    adminUserService
      .list({ role: selectedRole, q: debouncedSearch, page: 1 })
      .then((res) => {
        if (cancelled) return;
        setMembers(res.users);
        setMemberTotal(res.total);
        setMembersError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMembersError(err instanceof Error ? err.message : "Could not load users.");
      })
      .finally(() => {
        if (!cancelled) setLoadingMembers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRole, debouncedSearch, reloadKey]);

  const handleRoleChange = async (u: AdminUserRow, newRole: AdminUserRole) => {
    if (newRole === u.role) return;

    setBusyId(u.id);
    setMembersError(null);
    setNotice(null);
    try {
      await adminUserService.setRole(u.id, newRole);
      setNotice(
        `${u.name} is now ${newRole.toUpperCase()}. They must sign out and back in for their dashboard to change.`,
      );
      reload();
    } catch (err: unknown) {
      // The server decides (last admin, own role); surface its wording.
      setMembersError(err instanceof Error ? err.message : "Could not change the role.");
    } finally {
      setBusyId(null);
    }
  };

  const activeDef = roleDefinition(selectedRole);
  const countFor = (key: string) => summary.find((s) => s.key === key);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles &amp; Permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign roles to users. The platform has four fixed roles — they cannot be created or
          deleted.
        </p>
      </div>

      {summaryError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {summaryError}
          </span>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={reload}>
            Retry
          </Button>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Role list */}
        <div className="lg:col-span-1 space-y-2">
          {ROLE_DEFINITIONS.map((def) => {
            const counts = countFor(def.key);
            const selected = selectedRole === def.key;

            return (
              <button
                key={def.key}
                onClick={() => {
                  setSelectedRole(def.key);
                  setSearch("");
                  setNotice(null);
                }}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{def.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {loadingSummary || !counts ? (
                        "…"
                      ) : (
                        <>
                          {counts.total} {counts.total === 1 ? "user" : "users"}
                          {counts.inactive > 0 && ` · ${counts.inactive} inactive`}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{def.description}</p>
              </button>
            );
          })}
        </div>

        {/* Selected role detail */}
        <div className="lg:col-span-2 space-y-4">
          {/* What this role can reach */}
          <div className="rounded-2xl border border-border bg-card shadow-soft">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">{activeDef?.label} access</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Enforced per endpoint in the backend. This is a description of current behaviour,
                not an editable matrix.
              </p>
            </div>
            <ul className="divide-y divide-border">
              {activeDef?.capabilities.map((cap) => (
                <li key={cap} className="flex items-start gap-2 px-5 py-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-start gap-2 border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Signs in at <code className="font-mono">{activeDef?.dashboardPath}</code>. Pages
                under <code className="font-mono">{activeDef?.routePrefix}</code> are restricted to
                this role, and the API re-checks the role on every request.
              </span>
            </div>
          </div>

          {/* Members + role reassignment */}
          <div className="rounded-2xl border border-border bg-card shadow-soft">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-4 w-4" />
                Users with this role
                {!loadingMembers && (
                  <span className="text-sm font-normal text-muted-foreground">({memberTotal})</span>
                )}
              </h2>
              <div className="relative sm:w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search…"
                  className="h-9 rounded-xl pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {membersError && (
              <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {membersError}
              </div>
            )}

            {loadingMembers ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                {search ? "No users match that search." : "No users have this role."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {members.map((u) => {
                  const isSelf = String(u.id) === String(currentUser?.id ?? "");

                  return (
                    <li
                      key={u.id}
                      className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{u.name}</span>
                          {isSelf && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                              you
                            </span>
                          )}
                          {u.status !== "active" && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-600 dark:bg-red-900/30 dark:text-red-300">
                              inactive
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {busyId === u.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {/* Changing your own role is refused by the server, so
                            the control is disabled rather than left to fail. */}
                        <select
                          value={u.role}
                          disabled={isSelf || busyId === u.id}
                          onChange={(e) => handleRoleChange(u, e.target.value as AdminUserRole)}
                          aria-label={`Role for ${u.name}`}
                          className="h-9 rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-50"
                        >
                          {ROLE_DEFINITIONS.map((d) => (
                            <option key={d.key} value={d.key}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-start gap-2 border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                A role change applies to the API immediately. The user's dashboard updates the next
                time they sign in, or when their session is revalidated.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
