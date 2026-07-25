import { useState } from "react";
import { analyticsService } from "@/services/analytics";
import type { DateRange } from "@/types/analytics";
import {
  AnalyticsBarChart,
  AnalyticsRadialChart,
  DateRangeFilter,
  ExportButtons,
  DataTable,
  AnalyticsStatCard,
} from "@/components/analytics";
import { Stethoscope, Award, Clock, ThumbsUp } from "lucide-react";

export default function DoctorAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const activity = analyticsService.getDoctorActivity();
  const performance = analyticsService.getDoctorPerformance();
  const topDoctors = analyticsService.getTopDoctors();

  const totalAppointments = performance.reduce((s, d) => s + d.totalAppointments, 0);
  const avgSatisfaction = (performance.reduce((s, d) => s + d.satisfaction, 0) / performance.length).toFixed(1);
  const avgDuration = (performance.reduce((s, d) => s + d.avgDuration, 0) / performance.length).toFixed(0);

  const columns = [
    { key: "name", label: "Doctor", sortable: true },
    { key: "specialty", label: "Specialty", sortable: true },
    { key: "totalAppointments", label: "Appointments", sortable: true },
    { key: "completedAppointments", label: "Completed", sortable: true },
    { key: "avgDuration", label: "Avg Duration (min)", sortable: true },
    { key: "satisfaction", label: "Satisfaction %", sortable: true },
    { key: "aiAssisted", label: "AI Assisted", sortable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Doctor Analytics</h1>
          <p className="text-sm text-muted-foreground">Doctor performance, activity, and efficiency metrics</p>
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
        <AnalyticsStatCard icon={Stethoscope} label="Total Doctors" value={performance.length} change="0%" changeType="neutral" color="bg-teal-500" />
        <AnalyticsStatCard icon={Award} label="Total Appointments" value={totalAppointments} change="+10.2%" changeType="up" color="bg-blue-500" />
        <AnalyticsStatCard icon={Clock} label="Avg Duration" value={`${avgDuration}m`} change="-2m" changeType="down" color="bg-amber-500" />
        <AnalyticsStatCard icon={ThumbsUp} label="Avg Satisfaction" value={`${avgSatisfaction}%`} change="+1.5%" changeType="up" color="bg-green-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsBarChart
          title="Doctor Activity"
          subtitle="Appointments per doctor"
          data={activity}
          xKey="name"
          bars={[
            { dataKey: "appointments", color: "#6366f1", name: "Appointments" },
            { dataKey: "completed", color: "#22c55e", name: "Completed" },
          ]}
        />

        <AnalyticsRadialChart
          title="Top Doctors by Rating"
          subtitle="Satisfaction ratings"
          data={topDoctors.slice(0, 5).map((d) => ({
            name: d.name.replace("Dr. ", ""),
            value: d.satisfaction,
            fill: d.satisfaction >= 95 ? "#22c55e" : d.satisfaction >= 90 ? "#f59e0b" : "#ef4444",
          }))}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-4 text-sm font-semibold">Doctor Performance</h3>
        <DataTable
          columns={columns}
          data={performance as unknown as Record<string, unknown>[]}
          pageSize={5}
          searchPlaceholder="Search doctors..."
        />
      </div>
    </div>
  );
}
