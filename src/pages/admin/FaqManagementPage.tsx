import { useCallback, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Edit3,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type AiFaq } from "@/services/admin-ai";
import {
  useCreateFaqMutation,
  useDeleteFaqMutation,
  useFaqsQuery,
  useToggleFaqMutation,
  useUpdateFaqMutation,
} from "@/hooks/queries/useAdminQueries";
import { useDebounced } from "@/hooks/useDebounced";

type FormState = {
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = { question: "", answer: "", category: "general", isActive: true };

export default function FaqManagementPage() {
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const debouncedSearch = useDebounced(search, 300);

  const [expanded, setExpanded] = useState<number | null>(null);
  const [editing, setEditing] = useState<AiFaq | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiFaq | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Every FAQ write invalidates this query, so the list refreshes itself after
  // a create, edit, toggle or delete — no manual reload needed.
  const {
    data,
    isPending: loading,
    error: queryError,
    refetch,
  } = useFaqsQuery({ q: debouncedSearch, category, status });

  const faqs: AiFaq[] = data?.faqs ?? [];
  const categories: string[] = data?.categories ?? [];

  const createFaq = useCreateFaqMutation();
  const updateFaq = useUpdateFaqMutation();
  const toggleFaq = useToggleFaqMutation();
  const deleteFaq = useDeleteFaqMutation();

  const listError =
    error ?? (queryError instanceof Error ? queryError.message : queryError ? "Could not load FAQs." : null);

  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreating(true);
  };

  const openEdit = (f: AiFaq) => {
    setForm({ question: f.question, answer: f.answer, category: f.category, isActive: f.isActive });
    setFormError(null);
    setEditing(f);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
    setFormError(null);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (creating) {
        await createFaq.mutateAsync(form);
      } else if (editing) {
        await updateFaq.mutateAsync({ id: editing.id, input: form });
      }
      close();
      reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Could not save the FAQ.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (f: AiFaq) => {
    setBusyId(f.id);
    setError(null);
    try {
      await toggleFaq.mutateAsync(f.id);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not change the FAQ status.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteFaq.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete the FAQ.");
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
          <h1 className="text-2xl font-semibold tracking-tight">FAQ Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${faqs.length} ${faqs.length === 1 ? "entry" : "entries"}`} · the
            assistant answers from active entries before asking the model
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-xl bg-gradient-primary gap-1.5">
          <Plus className="h-4 w-4" /> Add FAQ
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
            placeholder="Search question or answer..."
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : faqs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No FAQs match these filters.
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-card">
              <div className="flex items-start justify-between gap-3 p-4">
                <button
                  onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                  className="min-w-0 flex-1 text-left"
                  aria-expanded={expanded === f.id}
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                        expanded === f.id ? "rotate-180" : ""
                      }`}
                    />
                    <span className="truncate text-sm font-medium">{f.question}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 pl-6 text-xs">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                      {f.category}
                    </span>
                    <span className={f.isActive ? "text-green-600" : "text-red-500"}>
                      {f.isActive ? "active" : "inactive"}
                    </span>
                    {f.intentName && (
                      <span className="text-muted-foreground">scenario: {f.intentName}</span>
                    )}
                  </div>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  {busyId === f.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <button
                    onClick={() => openEdit(f)}
                    aria-label={`Edit FAQ: ${f.question}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggle(f)}
                    disabled={busyId === f.id}
                    aria-label={f.isActive ? `Deactivate FAQ: ${f.question}` : `Activate FAQ: ${f.question}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-40"
                  >
                    {f.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(f)}
                    disabled={busyId === f.id}
                    aria-label={`Delete FAQ: ${f.question}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {expanded === f.id && (
                <div className="border-t border-border px-4 py-3 pl-10">
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{f.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / edit */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{creating ? "Add FAQ" : "Edit FAQ"}</DialogTitle>
            <DialogDescription>
              Active entries are matched against patient messages before the model is asked.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="faq-q">Question</Label>
              <Input
                id="faq-q"
                className="h-10 rounded-xl"
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="faq-a">Answer</Label>
              <Textarea
                id="faq-a"
                rows={5}
                className="rounded-xl"
                value={form.answer}
                onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="faq-cat">Category</Label>
                <Input
                  id="faq-cat"
                  list="faq-categories"
                  className="h-10 rounded-xl"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                />
                <datalist id="faq-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faq-status">Status</Label>
                <select
                  id="faq-status"
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
              {creating ? "Create FAQ" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete FAQ</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.question}" will be removed permanently. To keep it but stop the assistant using it, deactivate it instead.`
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
