import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CalendarClock,
  FileText,
  Loader2,
  MessageSquare,
  Settings,
  ShieldCheck,
  Star,
  Stethoscope,
  UserCircle,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/shared/StatCard";
import { useAdminStatisticsQuery } from "@/hooks/queries/useAdminQueries";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  // Both windows come from the same admin statistics endpoint the Statistics
  // page uses — there is no second source of truth for these numbers, and
  // React Query shares the cache between the two screens.
  const todayQuery = useAdminStatisticsQuery({ range: "today" });
  const monthQuery = useAdminStatisticsQuery({ range: "month" });

  const today = todayQuery.data ?? null;
  const month = monthQuery.data ?? null;
  const loading = todayQuery.isPending || monthQuery.isPending;
  const error =
    todayQuery.error || monthQuery.error ? "Could not load dashboard statistics." : null;

  // Head counts are point-in-time, so either response carries them.
  const k = month?.kpis ?? today?.kpis ?? null;
  const t = today?.kpis ?? null;

  const totalUsers =
    k === null ? null : k.activePatients + k.totalDoctors + k.totalSecretaries + k.totalAdmins;

  const show = (v: number | null | undefined) =>
    loading ? "…" : v === null || v === undefined ? "—" : v;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back, {user?.name?.split(" ")[0]}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Live user counts, derived from user.roles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={show(totalUsers)}
          sub="Active accounts"
          color="bg-gradient-primary"
        />
        <StatCard icon={UserCircle} label="Patients" value={show(k?.activePatients)} color="bg-gradient-health" />
        <StatCard icon={Stethoscope} label="Doctors" value={show(k?.totalDoctors)} color="bg-gradient-soft text-primary" />
        <StatCard icon={UserCircle} label="Secretaries" value={show(k?.totalSecretaries)} color="bg-gradient-primary" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">AI Conversations</span>
          </div>
          <div className="text-2xl font-semibold">{show(k?.aiConversations)}</div>
          <div className="text-xs text-muted-foreground mt-1">This month</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3 mb-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Today&apos;s Appointments</span>
          </div>
          <div className="text-2xl font-semibold">{show(t?.totalAppointments)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {loading || t === null
              ? " "
              : `${t.acceptedAppointments} confirmed, ${t.pendingAppointments} pending`}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Document Requests</span>
          </div>
          <div className="text-2xl font-semibold">{show(k?.documentRequests)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {loading || k === null ? " " : `${k.documentsPending} pending`}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3 mb-2">
            <Star className="h-5 w-5 text-amber-400" />
            <span className="text-sm text-muted-foreground">Average Rating</span>
          </div>
          <div className="text-2xl font-semibold">
            {loading ? "…" : (k?.averageRating ?? "—")}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {loading || k === null ? " " : `${k.totalRatings} rating${k.totalRatings === 1 ? "" : "s"} this month`}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">This month at a glance</h2>
            <Link to="/admin/statistics" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Full statistics <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : k === null ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No statistics available.</p>
          ) : (
            <div className="space-y-2">
              {[
                { label: "Appointments", value: k.totalAppointments },
                { label: "Completed", value: k.completedAppointments },
                { label: "Cancelled", value: k.cancelledAppointments },
                { label: "Pending", value: k.pendingAppointments },
                { label: "Active live chats", value: k.activeLiveChats },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/admin/users" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <UserPlus className="h-5 w-5" /> Add User
              </Link>
              <Link to="/admin/roles" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <ShieldCheck className="h-5 w-5" /> Roles
              </Link>
              <Link to="/admin/ai-config" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Brain className="h-5 w-5" /> AI Config
              </Link>
              <Link to="/admin/statistics" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <BarChart3 className="h-5 w-5" /> Statistics
              </Link>
              <Link to="/admin/ratings" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Star className="h-5 w-5" /> Ratings
              </Link>
              <Link to="/admin/settings" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Settings className="h-5 w-5" /> Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
