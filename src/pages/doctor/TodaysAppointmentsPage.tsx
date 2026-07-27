import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AlertCircle, CalendarDays, CheckCircle, Clock, Inbox, Loader2, Play, Radio, Search } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { useAppointments } from "@/hooks/useAppointments";
import { canComplete, hasStarted, isUpcoming } from "@/services/appointments";
import {
  AppointmentDetailsModal,
  AppointmentStatusBadge,
  CancelAppointmentModal,
  CompleteAppointmentModal,
} from "@/components/appointments";
import { TYPE_LABELS, type Appointment } from "@/types/appointment";

/**
 * The doctor's whole appointment workload, in the order they need to act on it.
 *
 * The tabs exist to make each of the doctor's four capabilities reachable:
 * view, accept, reject, and complete. "To complete" matters most — an
 * appointment from last week that was never closed out is the one thing a
 * today-only view can never surface, and therefore never let the doctor finish.
 */
type Tab = "needs-response" | "today" | "to-complete" | "upcoming" | "all";

export default function TodaysAppointmentsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("needs-response");
  const [search, setSearch] = useState("");

  // One fetch for the doctor's whole list, sliced locally. Keeps the tab counts
  // consistent with each other and avoids a spinner on every tab click.
  const {
    appointments,
    counts,
    loading,
    error,
    reload,
    busyId,
    actionError,
    dismissActionError,
    confirm,
    reject,
    complete,
  } = useAppointments({ limit: 500 });

  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);
  const [rejectAppt, setRejectAppt] = useState<Appointment | null>(null);
  const [completeAppt, setCompleteAppt] = useState<Appointment | null>(null);

  const groups = useMemo(() => {
    const byTime = (a: Appointment, b: Appointment) =>
      a.date.localeCompare(b.date) || a.time.localeCompare(b.time);

    return {
      "needs-response": appointments.filter((a) => a.status === "pending").sort(byTime),
      today: appointments.filter((a) => a.date === today).sort(byTime),
      // Oldest first: the most overdue is the most urgent to close out.
      "to-complete": appointments.filter(canComplete).sort(byTime),
      upcoming: appointments
        .filter((a) => isUpcoming(a) && (a.status === "pending" || a.status === "confirmed"))
        .sort(byTime),
      all: [...appointments].sort((a, b) => byTime(b, a)),
    } satisfies Record<Tab, Appointment[]>;
  }, [appointments, today]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query === "") return groups[tab];
    return groups[tab].filter(
      (a) => a.patientName.toLowerCase().includes(query) || a.reason.toLowerCase().includes(query),
    );
  }, [groups, tab, search]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "needs-response", label: "Needs your response", count: groups["needs-response"].length },
    { key: "today", label: "Today", count: groups.today.length },
    { key: "to-complete", label: "To complete", count: groups["to-complete"].length },
    { key: "upcoming", label: "Upcoming", count: groups.upcoming.length },
    { key: "all", label: "All", count: groups.all.length },
  ];

  const emptyMessage: Record<Tab, string> = {
    "needs-response": "No appointment requests waiting on you.",
    today: "Nothing scheduled for today.",
    "to-complete": "Nothing left to close out — you are up to date.",
    upcoming: "No upcoming appointments.",
    all: "You have no appointments yet.",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}

      {actionError && !rejectAppt && !completeAppt && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {actionError}
          </span>
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={dismissActionError}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Total" value={counts.total} color="bg-gradient-primary" />
        <StatCard icon={Inbox} label="Awaiting you" value={counts.pending} color="bg-gradient-health" />
        <StatCard icon={Clock} label="Confirmed" value={counts.confirmed} color="bg-gradient-soft text-primary" />
        <StatCard icon={CheckCircle} label="Completed" value={counts.completed} color="bg-gradient-primary" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by patient or reason…"
          className="h-10 rounded-xl pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground shadow-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading appointments…
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              {search.trim() ? "No appointments match your search." : emptyMessage[tab]}
            </p>
          </div>
        ) : (
          visible.map((a) => (
            <Card key={a.id} className="border-border bg-card shadow-soft">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
                    {a.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.patientName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.date === today ? "Today" : formatDate(a.date)} · {a.time}–{a.endTime} ·{" "}
                      {TYPE_LABELS[a.type]} · {a.reason}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {busyId === a.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  <AppointmentStatusBadge status={a.status} />
                  <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={() => setDetailsAppt(a)}>
                    Details
                  </Button>

                  {/* Accept / reject a request the patient has made. */}
                  {a.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="rounded-lg bg-gradient-health text-xs"
                        disabled={busyId === a.id}
                        onClick={() => void confirm(a.id)}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-xs text-destructive"
                        disabled={busyId === a.id}
                        onClick={() => {
                          dismissActionError();
                          setRejectAppt(a);
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {/* Today's confirmed appointments open the live screen, where
                      the running clock and "request extra time" live. */}
                  {a.status === "confirmed" && a.date === today && (
                    <Button
                      size="sm"
                      className="rounded-lg bg-gradient-health text-xs"
                      onClick={() => navigate(ROUTES.DOCTOR_LIVE_CONSULTATION)}
                    >
                      <Play className="mr-1 h-3 w-3" /> Start
                    </Button>
                  )}

                  {a.status === "in_progress" && (
                    <Button
                      size="sm"
                      className="rounded-lg bg-gradient-primary text-xs"
                      onClick={() => navigate(ROUTES.DOCTOR_LIVE_CONSULTATION)}
                    >
                      <Radio className="mr-1 h-3 w-3" /> Open live screen
                    </Button>
                  )}

                  {/* Close out a visit that has taken place. Gated on the same
                      rule the API applies, so this is never a button that must
                      fail — and "to complete" makes every eligible one reachable. */}
                  {canComplete(a) && (
                    <Button
                      size="sm"
                      className="rounded-lg bg-gradient-primary text-xs"
                      disabled={busyId === a.id}
                      onClick={() => {
                        dismissActionError();
                        setCompleteAppt(a);
                      }}
                    >
                      Complete
                    </Button>
                  )}
                  {a.status === "confirmed" && !hasStarted(a) && (
                    <span className="text-xs text-muted-foreground">Not started yet</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AppointmentDetailsModal open={!!detailsAppt} appointment={detailsAppt} onClose={() => setDetailsAppt(null)} />

      <CancelAppointmentModal
        mode="reject"
        open={!!rejectAppt}
        appointment={rejectAppt}
        error={actionError}
        onClose={() => {
          setRejectAppt(null);
          dismissActionError();
        }}
        onConfirm={(reason) => (rejectAppt ? reject(rejectAppt.id, reason) : Promise.resolve(false))}
      />

      <CompleteAppointmentModal
        open={!!completeAppt}
        appointment={completeAppt}
        error={actionError}
        onClose={() => {
          setCompleteAppt(null);
          dismissActionError();
        }}
        onConfirm={(notes) => (completeAppt ? complete(completeAppt.id, notes) : Promise.resolve(false))}
      />
    </div>
  );
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
