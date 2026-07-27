import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  Inbox,
  Loader2,
  RefreshCw,
  Siren,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { adjustmentService, REASON_LABELS, type AdjustmentRequest } from "@/services/consultation";

/** Refresh cadence for the queue — see useNotifications for why this polls. */
const POLL_MS = 15_000;

type Filter = "pending" | "all" | "approved" | "rejected";

export default function ScheduleAdjustmentsPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [requests, setRequests] = useState<AdjustmentRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Per-request overrides, so a secretary can grant fewer minutes than asked.
  const [grant, setGrant] = useState<Record<number, string>>({});
  const [note, setNote] = useState<Record<number, string>>({});

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const data = await adjustmentService.list(filter === "all" ? undefined : filter);
        setRequests(data.requests);
        setPendingCount(data.pendingCount);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load requests.");
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => void load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const decide = async (request: AdjustmentRequest, decision: "approve" | "reject") => {
    setBusyId(request.id);
    setActionError(null);
    setMessage(null);
    try {
      const raw = grant[request.id];
      const minutes = raw && raw.trim() !== "" ? Number(raw) : undefined;

      if (decision === "approve" && minutes !== undefined && !Number.isInteger(minutes)) {
        setActionError("Granted minutes must be a whole number.");
        return;
      }

      const result = await adjustmentService.decide({
        id: request.id,
        decision,
        minutes,
        note: note[request.id]?.trim() || undefined,
      });
      setMessage(result.message);
      await load(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "That decision failed.");
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: "pending", label: `Awaiting decision (${pendingCount})` },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule Adjustment Requests</h1>
          <p className="text-sm text-muted-foreground">
            Doctors asking for extra time that would delay other patients.
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => void load()}>
          <RefreshCw className="mr-1 h-3 w-3" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {actionError}
          </span>
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setActionError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {message && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" /> {message}
          </span>
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setMessage(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Inbox} label="Awaiting decision" value={pendingCount} color="bg-gradient-health" />
        <StatCard
          icon={Siren}
          label="Emergencies"
          value={requests.filter((r) => r.isEmergency).length}
          color="bg-gradient-primary"
        />
        <StatCard icon={Clock} label="Shown" value={requests.length} color="bg-gradient-soft text-primary" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground shadow-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            {filter === "pending" ? "Nothing waiting on you." : "No requests to show."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card
              key={r.id}
              className={`border-border shadow-soft ${r.isEmergency ? "ring-2 ring-destructive/30" : ""}`}
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{r.doctorName}</h3>
                      {r.isEmergency && (
                        <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                          <Siren className="h-3 w-3" /> Emergency
                        </span>
                      )}
                      <StatusChip status={r.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      With <span className="font-medium text-foreground">{r.patientName}</span> ·{" "}
                      {r.appointment.date} {r.appointment.start}–{r.appointment.end}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-2xl font-semibold tabular-nums text-primary">
                      +{r.requestedMinutes}
                    </p>
                    <p className="text-[11px] text-muted-foreground">minutes requested</p>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{REASON_LABELS[r.reasonCategory]}</p>
                  {r.reason && <p className="mt-0.5 text-muted-foreground">{r.reason}</p>}
                </div>

                {r.affectedCount > 0 && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <ArrowRight className="h-3 w-3" />
                    {r.affectedCount} later appointment{r.affectedCount === 1 ? "" : "s"} would be pushed
                    back
                  </p>
                )}

                {r.status === "pending" ? (
                  <div className="space-y-3 border-t border-border pt-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Grant instead (optional)
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={240}
                          placeholder={`${r.requestedMinutes}`}
                          value={grant[r.id] ?? ""}
                          onChange={(e) => setGrant((g) => ({ ...g, [r.id]: e.target.value }))}
                          className="mt-1 h-9 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
                        <Input
                          placeholder="Shown to the doctor"
                          value={note[r.id] ?? ""}
                          onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                          className="mt-1 h-9 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-lg bg-gradient-health"
                        disabled={busyId === r.id}
                        onClick={() => void decide(r, "approve")}
                      >
                        {busyId === r.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        )}
                        Approve {grant[r.id] ? `+${grant[r.id]} min` : `+${r.requestedMinutes} min`}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg text-destructive"
                        disabled={busyId === r.id}
                        onClick={() => void decide(r, "reject")}
                      >
                        <XCircle className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                    {r.grantedMinutes !== null && r.grantedMinutes !== r.requestedMinutes && (
                      <span className="font-medium text-foreground">
                        Granted {r.grantedMinutes} of {r.requestedMinutes} min.{" "}
                      </span>
                    )}
                    {r.decidedBy ? `Decided by ${r.decidedBy}` : "Decided automatically"}
                    {r.decidedAt ? ` · ${r.decidedAt}` : ""}
                    {r.decisionNote ? ` · “${r.decisionNote}”` : ""}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: AdjustmentRequest["status"] }) {
  const config: Record<AdjustmentRequest["status"], { label: string; className: string }> = {
    pending: { label: "Awaiting decision", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
    approved: { label: "Approved", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
    auto_approved: {
      label: "Approved automatically",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
    cancelled: { label: "Closed", className: "bg-muted text-muted-foreground" },
  };

  const { label, className } = config[status];

  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>{label}</span>;
}
