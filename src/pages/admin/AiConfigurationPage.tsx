import { useEffect, useState } from "react";
import { AlertCircle, Check, KeyRound, Loader2, MessageSquare, Power, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type AiSettings, type GeminiInfo } from "@/services/admin-ai";
import {
  useAiSettingsQuery,
  useUpdateAiSettingsMutation,
} from "@/hooks/queries/useAdminQueries";

function Toggle({
  checked,
  onChange,
  disabled,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function AiConfigurationPage() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, isPending: loading, error: queryError, refetch } = useAiSettingsQuery();
  const updateSettings = useUpdateAiSettingsMutation();

  // The form is a local draft seeded from the server copy, so a half-typed
  // message is not thrown away by a background refetch.
  const [draft, setDraft] = useState<AiSettings | null>(null);
  useEffect(() => {
    if (data?.settings) setDraft(data.settings);
  }, [data]);

  const settings = draft;
  const gemini: GeminiInfo | null = data?.gemini ?? null;
  const saving = updateSettings.isPending;

  const loadError =
    error ??
    (queryError instanceof Error
      ? queryError.message
      : queryError
        ? "Could not load AI settings."
        : null);

  const patch = (key: keyof AiSettings, value: string | boolean) =>
    setDraft((s) => (s ? { ...s, [key]: value } : s));

  const save = async () => {
    if (!settings) return;
    setNotice(null);
    setError(null);
    try {
      const res = await updateSettings.mutateAsync(settings);
      setDraft(res.settings);
      setNotice("Saved. The assistant uses these settings on its next message.");
      setTimeout(() => setNotice(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save AI settings.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading AI configuration…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Controls how the patient assistant behaves.
        </p>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {loadError}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <Check className="h-4 w-4 text-primary" /> {notice}
        </div>
      )}

      {/* Gemini — read-only, credential never leaves the server */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <KeyRound className="h-4 w-4" /> Gemini connection
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">API key</span>
            <span
              className={`inline-flex items-center gap-1.5 font-medium ${
                gemini?.configured ? "text-green-600" : "text-red-500"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {gemini?.configured ? "Configured on the server" : "Not configured"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Model</span>
            <span className="font-mono text-xs">{gemini?.model}</span>
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          {gemini?.note} To change the key or model, edit <code>GEMINI_API_KEY</code> /{" "}
          <code>GEMINI_MODEL</code> in <code>backend/.env</code> and restart the server.
        </p>
      </div>

      {/* Behaviour toggles */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Power className="h-4 w-4" /> Behaviour
        </h2>
        <Toggle
          label="Assistant enabled"
          hint="When off, free-text questions go straight to the options menu. Booking, cancellation, documents and live chat keep working."
          checked={settings?.assistant_enabled ?? false}
          onChange={(v) => patch("assistant_enabled", v)}
          disabled={saving}
        />
        <Toggle
          label="Use the FAQ"
          hint="Check the clinic FAQ before asking the model. A matching FAQ answer is used instead of a generated one."
          checked={settings?.faq_enabled ?? false}
          onChange={(v) => patch("faq_enabled", v)}
          disabled={saving}
        />
      </div>

      {/* Messages */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <MessageSquare className="h-4 w-4" /> Messages
        </h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="welcome">Welcome message</Label>
            <Textarea
              id="welcome"
              rows={3}
              className="rounded-xl"
              value={settings?.welcome_message ?? ""}
              onChange={(e) => patch("welcome_message", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Shown when a patient opens the assistant.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fallback">Fallback message</Label>
            <Textarea
              id="fallback"
              rows={3}
              className="rounded-xl"
              value={settings?.fallback_message ?? ""}
              onChange={(e) => patch("fallback_message", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Shown above the options menu when the assistant cannot understand a message. The
              options themselves come from the active{" "}
              <a href="/admin/scenarios" className="text-primary hover:underline">
                conversation scenarios
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || !settings} className="rounded-xl bg-gradient-primary">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
