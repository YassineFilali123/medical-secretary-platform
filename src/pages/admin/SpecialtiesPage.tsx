import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, Stethoscope } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  specialtyService,
  SpecialtyInUseError,
  MAX_SPECIALTY_NAME_LENGTH,
  MAX_SPECIALTY_DESCRIPTION_LENGTH,
  type Specialty,
} from "@/services/specialty";

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; specialty: Specialty };

export default function SpecialtiesPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Specialty | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState<{ specialty: Specialty; count: number } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setSpecialties(await specialtyService.list());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load specialties.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice((n) => (n === message ? null : n)), 4000);
  }

  function openCreate() {
    setName("");
    setDescription("");
    setFormError(null);
    setEditor({ mode: "create" });
  }

  function openEdit(s: Specialty) {
    setName(s.name);
    setDescription(s.description ?? "");
    setFormError(null);
    setEditor({ mode: "edit", specialty: s });
  }

  async function submitEditor() {
    if (editor.mode === "closed") return;

    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Name is required.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editor.mode === "create") {
        const created = await specialtyService.create({
          name: trimmed,
          description: description.trim() || undefined,
        });
        flash(`"${created.name}" added.`);
      } else {
        const updated = await specialtyService.update({
          id: editor.specialty.id,
          name: trimmed,
          description: description.trim(),
        });
        flash(`"${updated.name}" updated.`);
      }
      setEditor({ mode: "closed" });
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(s: Specialty) {
    setBusyId(s.id);
    try {
      const message = await specialtyService.remove(s.id);
      setConfirmDelete(null);
      flash(message);
      await load();
    } catch (err) {
      setConfirmDelete(null);
      if (err instanceof SpecialtyInUseError) {
        // Expected outcome, not a failure: offer the deactivate path instead.
        setDeleteBlocked({ specialty: s, count: err.doctorCount });
      } else {
        setError(err instanceof Error ? err.message : "Could not delete.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(s: Specialty) {
    setBusyId(s.id);
    try {
      const updated = await specialtyService.setActive(s.id, !s.isActive);
      flash(
        updated.isActive
          ? `"${updated.name}" is active again.`
          : `"${updated.name}" deactivated — hidden from the doctor form.`,
      );
      setDeleteBlocked(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change status.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = specialties.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
  });

  const activeCount = specialties.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Medical Specialties</h1>
          <p className="text-sm text-muted-foreground">
            Doctors choose from this list — they cannot type their own.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-xl bg-gradient-primary gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Specialty
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-2 text-sm text-green-700 dark:text-green-400">
          {notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Stethoscope className="h-4 w-4" aria-hidden="true" /> Total
          </div>
          <div className="mt-1 text-2xl font-semibold">{specialties.length}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">{activeCount}</div>
          <div className="text-xs text-muted-foreground">Offered to doctors</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="text-sm text-muted-foreground">Inactive</div>
          <div className="mt-1 text-2xl font-semibold text-muted-foreground">
            {specialties.length - activeCount}
          </div>
          <div className="text-xs text-muted-foreground">Hidden from new selections</div>
        </div>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder="Search specialties..."
          className="h-10 rounded-xl pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Doctors</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    {specialties.length === 0
                      ? "No specialties yet. Add one to get started."
                      : "No specialties match your search."}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className={`transition-colors hover:bg-accent/30 ${s.isActive ? "" : "opacity-60"}`}>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.description || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.doctorCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          s.isActive ? "text-green-600" : "text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${s.isActive ? "bg-green-500" : "bg-muted-foreground/50"}`}
                        />
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          disabled={busyId === s.id}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-40 focus-ring"
                          aria-label={`Edit ${s.name}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => void toggleActive(s)}
                          disabled={busyId === s.id}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-40 focus-ring"
                          aria-label={s.isActive ? `Deactivate ${s.name}` : `Activate ${s.name}`}
                          title={s.isActive ? "Deactivate" : "Activate"}
                        >
                          {s.isActive ? (
                            <ToggleRight className="h-4 w-4 text-green-600" aria-hidden="true" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(s)}
                          disabled={busyId === s.id}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 focus-ring"
                          aria-label={`Delete ${s.name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
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

      {/* ---------------- Create / edit ---------------- */}
      <Dialog
        open={editor.mode !== "closed"}
        onOpenChange={(next) => !saving && !next && setEditor({ mode: "closed" })}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editor.mode === "edit" ? "Edit specialty" : "Add specialty"}</DialogTitle>
            <DialogDescription>
              {editor.mode === "edit"
                ? "Renaming updates every doctor already using it."
                : "It becomes selectable in the doctor profile form straight away."}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="specialty-name">Name</Label>
            <Input
              id="specialty-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_SPECIALTY_NAME_LENGTH}
              placeholder="Cardiology"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="specialty-description">Description (optional)</Label>
            <Input
              id="specialty-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_SPECIALTY_DESCRIPTION_LENGTH}
              placeholder="Heart and blood vessels"
              className="h-10 rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={saving}
              onClick={() => setEditor({ mode: "closed" })}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-gradient-primary"
              disabled={saving || !name.trim()}
              onClick={() => void submitEditor()}
            >
              {saving ? "Saving..." : editor.mode === "edit" ? "Save changes" : "Add specialty"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Confirm delete ---------------- */}
      <Dialog open={confirmDelete !== null} onOpenChange={(next) => !next && setConfirmDelete(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete {confirmDelete?.name}?</DialogTitle>
            <DialogDescription>
              {confirmDelete && (confirmDelete.doctorCount ?? 0) > 0
                ? `${confirmDelete.doctorCount} doctor(s) use this specialty, so deleting it will be refused. You can deactivate it instead.`
                : "This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busyId === confirmDelete?.id}
              onClick={() => confirmDelete && void doDelete(confirmDelete)}
            >
              {busyId === confirmDelete?.id ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Blocked: offer deactivate ---------------- */}
      <Dialog open={deleteBlocked !== null} onOpenChange={(next) => !next && setDeleteBlocked(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cannot delete {deleteBlocked?.specialty.name}</DialogTitle>
            <DialogDescription>
              {deleteBlocked?.count} doctor{deleteBlocked?.count === 1 ? "" : "s"} currently use
              {deleteBlocked?.count === 1 ? "s" : ""} it. Deactivating hides it from the doctor form
              while those doctors keep their current value.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteBlocked(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-gradient-primary"
              disabled={busyId === deleteBlocked?.specialty.id}
              onClick={() => deleteBlocked && void toggleActive(deleteBlocked.specialty)}
            >
              Deactivate instead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
