import { useState } from "react";
import { analyticsService } from "@/services/analytics";
import type { DateRange } from "@/types/analytics";
import {
  AnalyticsLineChart,
  AnalyticsPieChart,
  DateRangeFilter,
  ExportButtons,
  DataTable,
  AnalyticsStatCard,
} from "@/components/analytics";
import { Users, UserPlus, Activity, HeartPulse } from "lucide-react";

export default function PatientAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const growth = analyticsService.getPatientGrowth();
  const activePatients = analyticsService.getMostActivePatients();
  const satisfaction = analyticsService.getSatisfaction();

  const latestTotal = growth[growth.length - 1]?.totalPatients ?? 0;
  const firstTotal = growth[0]?.totalPatients ?? 0;
  const totalNew = growth.reduce((s, g) => s + g.newPatients, 0);
  const avgSatisfaction = (satisfaction.reduce((s, d) => s + d.rating, 0) / satisfaction.length).toFixed(1);

  const columns = [
    { key: "name", label: "Patient Name", sortable: true },
    { key: "visits", label: "Total Visits", sortable: true },
    { key: "lastVisit", label: "Last Visit", sortable: true },
    { key: "conditions", label: "Conditions", sortable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patient Analytics</h1>
          <p className="text-sm text-muted-foreground">Patient growth, engagement, and satisfaction metrics</p>
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
        <AnalyticsStatCard icon={Users} label="Total Patients" value={latestTotal} change={`+${latestTotal - firstTotal}`} changeType="up" color="bg-blue-500" />
        <AnalyticsStatCard icon={UserPlus} label="New Patients" value={totalNew} change="+15.1%" changeType="up" color="bg-green-500" />
        <AnalyticsStatCard icon={Activity} label="Avg Visits/Patient" value={(totalNew > 0 ? (activePatients.reduce((s, p) => s + p.visits, 0) / activePatients.length).toFixed(1) : "0")} change="+0.3" changeType="up" color="bg-purple-500" />
        <AnalyticsStatCard icon={HeartPulse} label="Satisfaction" value={`${avgSatisfaction}/5`} change="+0.2" changeType="up" color="bg-emerald-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsLineChart
          title="Patient Growth"
          subtitle="Monthly new patients and total patient count"
          data={growth}
          xKey="date"
          lines={[
            { dataKey: "newPatients", color: "#22c55e", name: "New Patients" },
            { dataKey: "totalPatients", color: "#6366f1", name: "Total Patients" },
          ]}
        />

        <AnalyticsLineChart
          title="Satisfaction Trend"
          subtitle="Monthly patient satisfaction ratings"
          data={satisfaction}
          xKey="month"
          lines={[{ dataKey: "rating", color: "#f59e0b", name: "Rating" }]}
          yAxisDomain={[3, 5]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsPieChart
          title="Visit Reasons"
          subtitle="Distribution of visit types"
          data={[
            { name: "Consultation", value: 420, fill: "#6366f1" },
            { name: "Follow-up", value: 280, fill: "#22c55e" },
            { name: "Emergency", value: 85, fill: "#ef4444" },
            { name: "Checkup", value: 310, fill: "#f59e0b" },
          ]}
        />

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold">Most Active Patients</h3>
          <DataTable
            columns={columns}
            data={activePatients as unknown as Record<string, unknown>[]}
            pageSize={5}
            searchPlaceholder="Search patients..."
          />
        </div>
      </div>
    </div>
  );
}
