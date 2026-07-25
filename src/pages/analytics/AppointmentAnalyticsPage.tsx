import { useState } from "react";
import { analyticsService } from "@/services/analytics";
import type { DateRange } from "@/types/analytics";
import {
  AnalyticsBarChart,
  AnalyticsPieChart,
  AnalyticsLineChart,
  DateRangeFilter,
  ExportButtons,
  DataTable,
  AnalyticsStatCard,
} from "@/components/analytics";
import { CalendarDays, CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS_BADGES: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  confirmed: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
  "no-show": "bg-orange-100 text-orange-700",
};

export default function AppointmentAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const monthlyData = analyticsService.getMonthlyAppointments();
  const statusData = analyticsService.getAppointmentStatus();
  const dailyData = analyticsService.getDailyAppointments();
  const recentAppts = analyticsService.getRecentAppointments();

  const totalAppointments = monthlyData.reduce((s, m) => s + m.total, 0);
  const totalCompleted = monthlyData.reduce((s, m) => s + m.completed, 0);
  const totalCancelled = monthlyData.reduce((s, m) => s + m.cancelled, 0);
  const completionRate = ((totalCompleted / totalAppointments) * 100).toFixed(1);

  const columns = [
    { key: "patientName", label: "Patient", sortable: true },
    { key: "doctorName", label: "Doctor", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "time", label: "Time" },
    {
      key: "status",
      label: "Status",
      render: (item: Record<string, unknown>) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[item.status as string] ?? ""}`}>
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
          <h1 className="text-2xl font-semibold tracking-tight">Appointment Analytics</h1>
          <p className="text-sm text-muted-foreground">Detailed appointment performance metrics</p>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsStatCard icon={CalendarDays} label="Total Appointments" value={totalAppointments} change="+12.5%" changeType="up" color="bg-blue-500" />
        <AnalyticsStatCard icon={CheckCircle} label="Completed" value={totalCompleted} change="+8.3%" changeType="up" color="bg-green-500" />
        <AnalyticsStatCard icon={XCircle} label="Cancelled" value={totalCancelled} change="-3.2%" changeType="down" color="bg-red-500" />
        <AnalyticsStatCard icon={Clock} label="Completion Rate" value={`${completionRate}%`} change="+2.1%" changeType="up" color="bg-purple-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsBarChart
          title="Monthly Appointments"
          subtitle="Completed vs Cancelled by month"
          data={monthlyData}
          xKey="month"
          bars={[
            { dataKey: "completed", color: "#22c55e", name: "Completed" },
            { dataKey: "cancelled", color: "#ef4444", name: "Cancelled" },
          ]}
        />

        <AnalyticsPieChart
          title="Status Distribution"
          subtitle="Overall appointment status breakdown"
          data={statusData.map((d) => ({ name: d.status, value: d.count, fill: d.fill }))}
        />
      </div>

      <AnalyticsLineChart
        title="Daily Appointments"
        subtitle="This week's daily appointment trends"
        data={dailyData}
        xKey="date"
        lines={[
          { dataKey: "appointments", color: "#6366f1", name: "Total" },
          { dataKey: "completed", color: "#22c55e", name: "Completed" },
          { dataKey: "cancelled", color: "#ef4444", name: "Cancelled" },
          { dataKey: "noShow", color: "#f97316", name: "No Show" },
        ]}
      />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-4 text-sm font-semibold">Recent Appointments</h3>
        <DataTable
          columns={columns}
          data={recentAppts as unknown as Record<string, unknown>[]}
          pageSize={5}
          searchPlaceholder="Search appointments..."
        />
      </div>
    </div>
  );
}
