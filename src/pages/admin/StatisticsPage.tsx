import { useCallback, useState } from "react";
import {
  AlertCircle,
  Bot,
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  FileText,
  Loader2,
  MessageCircle,
  Star,
  Stethoscope,
  ThumbsUp,
  UserCog,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AnalyticsBarChart,
  AnalyticsLineChart,
  AnalyticsPieChart,
  ChartCard,
  DateRangeFilter,
  ExportButtons,
} from "@/components/analytics";
import { type StatsRangeKey } from "@/services/admin-statistics";
import { useAdminStatisticsQuery } from "@/hooks/queries/useAdminQueries";
import type { DateRange } from "@/types/analytics";

/** Calendar periods, per the dashboard spec. */
const RANGES: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  confirmed: "#3b82f6",
  pending: "#f59e0b",
  cancelled: "#ef4444",
  rejected: "#6b7280",
  in_progress: "#8b5cf6",
};

/** A KPI tile. Deliberately no trend arrow — there is no historical baseline. */
function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  hint?: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
    </div>
  );
}

/** "2026-08-11" → "11 Aug" for chart axes. */
function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function StatisticsPage() {
  const [range, setRange] = useState<DateRange>("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Held back until a custom range is fully specified, rather than firing a
  // request the server would reject.
  const ready = range !== "custom" || Boolean(startDate && endDate);

  const {
    data,
    isPending,
    error: queryError,
    refetch,
  } = useAdminStatisticsQuery(
    { range: range as StatsRangeKey, startDate, endDate },
    ready,
  );

  const loading = ready && isPending;
  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? "Could not load statistics."
        : null;

  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  /**
   * Real .xlsx via ExcelJS, built from the same StatsResponse this page is
   * rendering — see lib/statistics-export. Replaces the hand-rolled CSV, so
   * the file and the screen cannot disagree.
   */
  const exportExcel = async () => {
    if (!data || exporting) return;

    setExporting(true);
    setExportError(null);
    try {
      // Loaded on demand — ExcelJS is large and only export needs it.
      const { downloadStatisticsWorkbook } = await import("@/lib/statistics-export");
      await downloadStatisticsWorkbook(data);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Could not generate the Excel file.");
    } finally {
      setExporting(false);
    }
  };

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Statistics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.range.from} to ${data.range.to}` : "Loading…"}
          </p>
        </div>
        <ExportButtons
          handlers={{
            excel: () => void exportExcel(),
            pdf: () => window.print(),
            print: () => window.print(),
          }}
        />
      </div>

      <DateRangeFilter
        ranges={RANGES}
        value={range}
        onChange={setRange}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {range === "custom" && (!startDate || !endDate) && (
        <p className="text-sm text-muted-foreground">Pick a start and end date to see statistics.</p>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={reload}>
            Retry
          </Button>
        </div>
      )}

      {exporting && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Building the Excel workbook…
        </div>
      )}

      {exportError && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {exportError}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading statistics…
        </div>
      ) : kpis && data ? (
        <>
          {/* Appointments */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Appointments</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <Kpi icon={CalendarCheck} label="Total" value={kpis.totalAppointments} color="bg-primary" />
              <Kpi icon={CalendarCheck} label="Completed" value={kpis.completedAppointments} color="bg-emerald-500" />
              <Kpi icon={CalendarClock} label="Accepted" value={kpis.acceptedAppointments} color="bg-blue-500" />
              <Kpi icon={CalendarClock} label="Pending" value={kpis.pendingAppointments} color="bg-amber-500" />
              <Kpi icon={CalendarX2} label="Cancelled" value={kpis.cancelledAppointments} color="bg-rose-500" />
            </div>
          </section>

          {/* Activity */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Activity</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={Bot} label="AI Conversations" value={kpis.aiConversations} color="bg-violet-500" />
              <Kpi
                icon={MessageCircle}
                label="Active Live Chats"
                value={kpis.activeLiveChats}
                hint="right now"
                color="bg-teal-500"
              />
              <Kpi
                icon={FileText}
                label="Document Requests"
                value={kpis.documentRequests}
                hint={`${kpis.documentsPending} pending`}
                color="bg-indigo-500"
              />
              <Kpi
                icon={Star}
                label="Average Rating"
                value={kpis.averageRating ?? "—"}
                hint={`${kpis.totalRatings} rating${kpis.totalRatings === 1 ? "" : "s"}`}
                color="bg-amber-400"
              />
            </div>
          </section>

          {/* People — current totals, not affected by the date range */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              People <span className="font-normal">· current totals, not date-filtered</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={Users} label="Active Patients" value={kpis.activePatients} color="bg-green-500" />
              <Kpi icon={Stethoscope} label="Doctors" value={kpis.totalDoctors} color="bg-blue-500" />
              <Kpi icon={UserCog} label="Secretaries" value={kpis.totalSecretaries} color="bg-amber-500" />
              <Kpi
                icon={ThumbsUp}
                label="Patient Satisfaction"
                value={kpis.patientSatisfaction !== null ? `${kpis.patientSatisfaction}%` : "—"}
                hint="ratings of 4★ or 5★"
                color="bg-emerald-500"
              />
            </div>
          </section>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsLineChart
              title="Appointments over time"
              subtitle="By appointment date"
              className="lg:col-span-2"
              data={data.charts.appointmentsOverTime.map((d) => ({
                date: shortDate(d.date),
                Total: d.total,
                Completed: d.completed,
                Cancelled: d.cancelled,
              }))}
              xKey="date"
              lines={[
                { dataKey: "Total", color: "#6366f1", name: "Total" },
                { dataKey: "Completed", color: "#10b981", name: "Completed" },
                { dataKey: "Cancelled", color: "#ef4444", name: "Cancelled" },
              ]}
            />

            {data.charts.appointmentStatus.length > 0 ? (
              <AnalyticsPieChart
                title="Appointment status distribution"
                data={data.charts.appointmentStatus.map((s) => ({
                  name: s.status,
                  value: s.count,
                  fill: STATUS_COLORS[s.status] ?? "#94a3b8",
                }))}
              />
            ) : (
              <ChartCard title="Appointment status distribution">
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No appointments in this range.
                </p>
              </ChartCard>
            )}

            <AnalyticsBarChart
              title="Doctor ratings distribution"
              subtitle="Ratings submitted in this range"
              data={data.charts.ratingDistribution.map((r) => ({
                stars: `${r.stars}★`,
                Ratings: r.count,
              }))}
              xKey="stars"
              bars={[{ dataKey: "Ratings", color: "#f59e0b", name: "Ratings" }]}
            />

            <AnalyticsLineChart
              title="AI conversations over time"
              subtitle="Conversations the assistant took part in"
              data={data.charts.aiConversationsOverTime.map((d) => ({
                date: shortDate(d.date),
                Conversations: d.conversations,
              }))}
              xKey="date"
              lines={[{ dataKey: "Conversations", color: "#8b5cf6", name: "Conversations" }]}
            />

            <AnalyticsLineChart
              title="Document requests over time"
              subtitle="By request date"
              data={data.charts.documentRequestsOverTime.map((d) => ({
                date: shortDate(d.date),
                Requests: d.requests,
              }))}
              xKey="date"
              lines={[{ dataKey: "Requests", color: "#6366f1", name: "Requests" }]}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
