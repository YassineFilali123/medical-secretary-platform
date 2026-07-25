import { useState } from "react";
import { analyticsService } from "@/services/analytics";
import type { DateRange } from "@/types/analytics";
import {
  AnalyticsBarChart,
  AnalyticsPieChart,
  AnalyticsLineChart,
  DateRangeFilter,
  ExportButtons,
  AnalyticsStatCard,
} from "@/components/analytics";
import { Phone, PhoneCall, PhoneMissed, Clock } from "lucide-react";

export default function CallAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const callData = analyticsService.getCallAnalytics();
  const outcomes = analyticsService.getCallOutcomes();
  const responseTime = analyticsService.getAvgResponseTime();
  const distribution = analyticsService.getCallDistribution();

  const totalInbound = callData.reduce((s, c) => s + c.inbound, 0);
  const totalOutbound = callData.reduce((s, c) => s + c.outbound, 0);
  const totalMissed = callData.reduce((s, c) => s + c.missed, 0);
  const avgResponse = (responseTime.reduce((s, r) => s + r.avgMinutes, 0) / responseTime.length).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Call Analytics</h1>
          <p className="text-sm text-muted-foreground">Call volume, distribution, and response time metrics</p>
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
        <AnalyticsStatCard icon={Phone} label="Inbound Calls" value={totalInbound} change="+8.5%" changeType="up" color="bg-blue-500" />
        <AnalyticsStatCard icon={PhoneCall} label="Outbound Calls" value={totalOutbound} change="+5.2%" changeType="up" color="bg-green-500" />
        <AnalyticsStatCard icon={PhoneMissed} label="Missed Calls" value={totalMissed} change="-18.5%" changeType="down" color="bg-red-500" />
        <AnalyticsStatCard icon={Clock} label="Avg Response" value={`${avgResponse}m`} change="-0.3m" changeType="down" color="bg-amber-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsBarChart
          title="Calls by Hour"
          subtitle="Inbound, outbound, and missed calls throughout the day"
          data={callData}
          xKey="hour"
          bars={[
            { dataKey: "inbound", color: "#6366f1", name: "Inbound" },
            { dataKey: "outbound", color: "#22c55e", name: "Outbound" },
            { dataKey: "missed", color: "#ef4444", name: "Missed" },
          ]}
        />

        <AnalyticsPieChart
          title="Call Outcomes"
          subtitle="Distribution of call results"
          data={outcomes.map((o) => ({ name: o.outcome, value: o.count, fill: o.fill }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsLineChart
          title="Avg Response Time"
          subtitle="Daily average response time in minutes"
          data={responseTime}
          xKey="date"
          lines={[{ dataKey: "avgMinutes", color: "#f59e0b", name: "Avg Minutes" }]}
        />

        <AnalyticsPieChart
          title="Call Distribution"
          subtitle="Calls by purpose category"
          data={distribution.map((d) => ({ name: d.type, value: d.count, fill: d.fill }))}
        />
      </div>
    </div>
  );
}
