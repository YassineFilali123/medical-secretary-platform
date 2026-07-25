import {
  MessageSquare,
  Users,
  Stethoscope,
  UserCheck,
  AlertTriangle,
  Clock,
  Phone,
  CalendarCheck,
  Activity,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { LiveIndicator } from "@/components/monitoring";
import { useMonitoring } from "@/contexts/MonitoringContext";

export default function LiveDashboardPage() {
  const { stats, conversations, emergencyQueue, callQueue } = useMonitoring();

  const criticalEmergencies = emergencyQueue.filter(
    (e) => e.priority === "critical" && e.status !== "resolved"
  ).length;
  const waitingCalls = callQueue.filter((c) => c.status === "waiting").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Live Dashboard</h1>
          <LiveIndicator label="Live" />
        </div>
        <p className="text-xs text-muted-foreground">
          Auto-updates every 4 seconds
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MessageSquare}
          label="Active AI Conversations"
          value={stats.activeConversations}
          color="bg-gradient-primary"
        />
        <StatCard
          icon={Users}
          label="Waiting Patients"
          value={stats.waitingPatients}
          color="bg-gradient-health"
        />
        <StatCard
          icon={Stethoscope}
          label="Online Doctors"
          value={stats.onlineDoctors}
          color="bg-gradient-soft text-primary"
        />
        <StatCard
          icon={UserCheck}
          label="Available Secretaries"
          value={stats.availableSecretaries}
          color="bg-gradient-primary"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={AlertTriangle}
          label="Emergency Cases"
          value={stats.emergencyCases}
          color="bg-gradient-health"
        />
        <StatCard
          icon={Clock}
          label="Avg Response Time"
          value={`${stats.avgResponseTime}s`}
          color="bg-gradient-soft text-primary"
        />
        <StatCard
          icon={Phone}
          label="Today's Calls"
          value={stats.todayCalls}
          color="bg-gradient-primary"
        />
        <StatCard
          icon={CalendarCheck}
          label="Today's Appointments"
          value={stats.todayAppointments}
          color="bg-gradient-health"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-primary" />
              Recent Activity
            </h3>
            <LiveIndicator size="sm" />
          </div>
          <div className="space-y-3">
            {conversations.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl bg-muted/50 p-3"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-soft text-xs font-bold text-primary">
                  {c.patientName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{c.patientName}</p>
                  <p className="text-[11px] text-muted-foreground">{c.summary}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(c.lastActivity).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              Priority Distribution
            </h3>
          </div>
          <div className="space-y-3">
            {(["critical", "high", "medium", "low"] as const).map((p) => {
              const count = conversations.filter((c) => c.priority === p).length;
              const total = conversations.length || 1;
              const pct = Math.round((count / total) * 100);
              const colors = {
                critical: "bg-red-500",
                high: "bg-orange-500",
                medium: "bg-amber-500",
                low: "bg-green-500",
              };
              return (
                <div key={p} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize font-medium">{p}</span>
                    <span className="text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${colors[p]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {criticalEmergencies > 0 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-700">
                {criticalEmergencies} critical emergency case{criticalEmergencies > 1 ? "s" : ""} requiring immediate attention
              </p>
            </div>
          )}
          {waitingCalls > 0 && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-700">
                {waitingCalls} caller{waitingCalls > 1 ? "s" : ""} waiting in queue
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
