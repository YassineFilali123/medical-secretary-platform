import { useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Users,
  Stethoscope,
  Bot,
  Clock,
  Smile,
  PhoneMissed,
  TrendingUp,
} from "lucide-react";
import { analyticsService } from "@/services/analytics";
import type { DateRange } from "@/types/analytics";
import {
  AnalyticsStatCard,
  AnalyticsLineChart,
  AnalyticsBarChart,
  AnalyticsPieChart,
  AnalyticsAreaChart,
  DateRangeFilter,
  ExportButtons,
  DataTable,
} from "@/components/analytics";

const ICON_MAP: Record<string, React.ElementType> = {
  CalendarDays,
  CheckCircle,
  XCircle,
  Users,
  Stethoscope,
  Bot,
  Clock,
  Smile,
  PhoneMissed,
  TrendingUp,
};

const STATUS_BADGES: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  confirmed: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
  "no-show": "bg-orange-100 text-orange-700",
};

export default function AnalyticsDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const kpis = analyticsService.getKpiCards();
  const dailyData = analyticsService.getDailyAppointments();
  const monthlyData = analyticsService.getMonthlyAppointments();
  const statusData = analyticsService.getAppointmentStatus();
  const aiData = analyticsService.getAiConversations();
  const satisfaction = analyticsService.getSatisfaction();
  const topDoctors = analyticsService.getTopDoctors();
  const recentAppts = analyticsService.getRecentAppointments();

  const recentAppointmentColumns = [
    { key: "patientName", label: "Patient", sortable: true },
    { key: "doctorName", label: "Doctor", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "time", label: "Time" },
    {
      key: "status",
      label: "Status",
      render: (item: Record<string, unknown>) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[item.status as string] ?? "bg-gray-100 text-gray-700"}`}>
          {String(item.status)}
        </span>
      ),
    },
    { key: "type", label: "Type" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of platform performance and metrics</p>
        </div>
        <ExportButtons />
      </div>

      <DateRangeFilter
        value={dateRange}
        onChange={setDateRange}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.slice(0, 5).map((kpi) => {
          const Icon = ICON_MAP[kpi.icon] ?? TrendingUp;
          return <AnalyticsStatCard key={kpi.id} icon={Icon} label={kpi.label} value={kpi.value} change={kpi.change} changeType={kpi.changeType} color={kpi.color} />;
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.slice(5).map((kpi) => {
          const Icon = ICON_MAP[kpi.icon] ?? TrendingUp;
          return <AnalyticsStatCard key={kpi.id} icon={Icon} label={kpi.label} value={kpi.value} change={kpi.change} changeType={kpi.changeType} color={kpi.color} />;
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsLineChart
          title="Daily Appointments"
          subtitle="This week's appointment trends"
          data={dailyData}
          xKey="date"
          lines={[
            { dataKey: "appointments", color: "#6366f1", name: "Total" },
            { dataKey: "completed", color: "#22c55e", name: "Completed" },
            { dataKey: "cancelled", color: "#ef4444", name: "Cancelled" },
          ]}
        />

        <AnalyticsBarChart
          title="Monthly Appointments"
          subtitle="Appointment volume over the year"
          data={monthlyData}
          xKey="month"
          bars={[
            { dataKey: "completed", color: "#22c55e", name: "Completed" },
            { dataKey: "cancelled", color: "#ef4444", name: "Cancelled" },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AnalyticsPieChart
          title="Appointment Status"
          subtitle="Distribution of appointment outcomes"
          data={statusData.map((d) => ({ name: d.status, value: d.count, fill: d.fill }))}
        />

        <AnalyticsAreaChart
          title="AI Conversations"
          subtitle="Daily conversation volume"
          data={aiData}
          xKey="date"
          areas={[
            { dataKey: "resolved", color: "#22c55e", name: "Resolved", stackId: "1" },
            { dataKey: "escalated", color: "#f59e0b", name: "Escalated", stackId: "1" },
          ]}
        />

        <AnalyticsLineChart
          title="Patient Satisfaction"
          subtitle="Monthly satisfaction ratings"
          data={satisfaction}
          xKey="month"
          lines={[{ dataKey: "rating", color: "#f59e0b", name: "Rating" }]}
          yAxisDomain={[3, 5]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold">Top Doctors</h3>
          <div className="space-y-3">
            {topDoctors.slice(0, 5).map((doctor, i) => (
              <div key={doctor.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{doctor.name}</div>
                    <div className="text-xs text-muted-foreground">{doctor.specialty}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{doctor.satisfaction}%</div>
                  <div className="text-xs text-muted-foreground">{doctor.appointments} appts</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold">Recent Appointments</h3>
          <DataTable
            columns={recentAppointmentColumns}
            data={recentAppts as unknown as Record<string, unknown>[]}
            pageSize={5}
            searchable={false}
          />
        </div>
      </div>
    </div>
  );
}
