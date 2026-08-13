import { useCallback, useState } from "react";
import {
  AlertCircle,
  Edit3,
  Info,
  Loader2,
  Lock,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type AiScenario } from "@/services/admin-ai";
import {
  useCreateScenarioMutation,
  useDeleteScenarioMutation,
  useScenariosQuery,
  useToggleScenarioMutation,
  useUpdateScenarioMutation,
} from "@/hooks/queries/useAdminQueries";

type FormState = {
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  keywords: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  priority: 10,
  isActive: true,
  keywords: "",
};

/** book_appointment → Book Appointment */
function pretty(name: string): string {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ConversationScenariosPage() {
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AiScenario | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiScenario | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Scenario writes invalidate this query, so the grid refreshes itself.
  const { data, isPending: loading, error: queryError, refetch } = useScenariosQuery();

  const scenarios: AiScenario[] = data?.scenarios ?? [];

  const createScenario = useCreateScenarioMutation();
  const updateScenario = useUpdateScenarioMutation();
  const toggleScenario = useToggleScenarioMutation();
  const deleteScenario = useDeleteScenarioMutation();

  const listError =
    error ??
    (queryError instanceof Error
      ? queryError.message
      : queryError
        ? "Could not load scenarios."
        : null);

  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreating(true);
  };

  const openEdit = (s: AiScenario) => {
    setForm({
      name: s.name,
      description: s.description ?? "",
      priority: s.priority,
      isActive: s.isActive,
      keywords: s.keywords.join(", "),
    });
    setFormError(null);
    setEditing(s);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
    setFormError(null);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);

    const payload = {
      name: form.name,
      description: form.description,
      priority: form.priority,
      isActive: form.isActive,
      keywords: form.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    };

    try {
      if (creating) {
        await createScenario.mutateAsync(payload);
      } else if (editing) {
        // The server refuses a rename of a built-in; don't even send it.
        const patch = editing.isBuiltIn ? { ...payload, name: undefined } : payload;
        await updateScenario.mutateAsync({ id: editing.id, input: patch });
      }
      close();
      reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Could not save the scenario.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s: AiScenario) => {
    setBusyId(s.id);
    setError(null);
    try {
      await toggleScenario.mutateAsync(s.id);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not change the scenario status.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteScenario.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete the scenario.");
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
          <h1 className="text-2xl font-semibold tracking-tight">Conversation Scenarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What the assistant recognises. Active built-in scenarios also become the buttons on the
            fallback menu.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-xl bg-gradient-primary gap-1.5">
          <Plus className="h-4 w-4" /> Add scenario
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

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Scenarios marked <Lock className="inline h-3 w-3" /> are implemented by the assistant
          itself. They can be deactivated, re-described and re-keyworded, but not renamed or
          deleted — the code path behind them would still exist.
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {scenarios.map((s) => (
            <div
              key={s.id}
              className={`rounded-xl border p-4 ${
                s.isActive ? "border-border bg-card" : "border-dashed border-border bg-muted/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{pretty(s.name)}</span>
                    {s.isBuiltIn && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{s.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {busyId === s.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <button
                    onClick={() => openEdit(s)}
                    aria-label={`Edit ${s.name}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggle(s)}
                    disabled={busyId === s.id}
                    aria-label={s.isActive ? `Deactivate ${s.name}` : `Activate ${s.name}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-40"
                  >
                    {s.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </button>
                  {!s.isBuiltIn && (
                    <button
                      onClick={() => setDeleteTarget(s)}
                      disabled={busyId === s.id}
                      aria-label={`Delete ${s.name}`}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {s.description && (
                <p className="mt-2 text-xs text-muted-foreground">{s.description}</p>
              )}

              {s.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.keywords.slice(0, 6).map((k) => (
                    <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {k}
                    </span>
                  ))}
                  {s.keywords.length > 6 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{s.keywords.length - 6}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center gap-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
                <span className={s.isActive ? "text-green-600" : "text-red-500"}>
                  {s.isActive ? "active" : "inactive"}
                </span>
                <span>priority {s.priority}</span>
                {s.faqCount > 0 && <span>{s.faqCount} FAQ</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{creating ? "Add scenario" : `Edit ${pretty(form.name)}`}</DialogTitle>
            <DialogDescription>
              Keywords are matched against patient messages when the model is unavailable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="sc-name">Name</Label>
              <Input
                id="sc-name"
                className="h-10 rounded-xl font-mono text-sm"
                placeholder="book_appointment"
                disabled={editing?.isBuiltIn}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                {editing?.isBuiltIn
                  ? "Built-in scenarios cannot be renamed."
                  : "Lowercase letters, numbers and underscores only."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sc-desc">Description</Label>
              <Textarea
                id="sc-desc"
                rows={2}
                className="rounded-xl"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sc-kw">Keywords</Label>
              <Textarea
                id="sc-kw"
                rows={2}
                className="rounded-xl"
                placeholder="book, schedule, appointment"
                value={form.keywords}
                onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Comma separated.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sc-prio">Priority (1–100)</Label>
                <Input
                  id="sc-prio"
                  type="number"
                  min={1}
                  max={100}
                  className="h-10 rounded-xl"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sc-status">Status</Label>
                <select
                  id="sc-status"
                  value={form.isActive ? "active" : "inactive"}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === "active" }))}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-gradient-primary" onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {creating ? "Create scenario" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete scenario</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" and its keywords will be removed. Any FAQ linked to it is kept, just unlinked.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={remove}
              disabled={busyId !== null}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
