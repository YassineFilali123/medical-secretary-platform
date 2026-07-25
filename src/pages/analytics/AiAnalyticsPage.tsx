import { useState } from "react";
import { analyticsService } from "@/services/analytics";
import type { DateRange } from "@/types/analytics";
import {
  AnalyticsAreaChart,
  AnalyticsBarChart,
  AnalyticsRadialChart,
  DateRangeFilter,
  ExportButtons,
  DataTable,
  AnalyticsStatCard,
} from "@/components/analytics";
import { Bot, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";

const RESOLVED_BADGES: Record<string, string> = {
  true: "bg-green-100 text-green-700",
  false: "bg-yellow-100 text-yellow-700",
};

export default function AiAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const conversations = analyticsService.getAiConversations();
  const performance = analyticsService.getAiPerformance();
  const hours = analyticsService.getAiConversationHours();
  const recentConvos = analyticsService.getRecentAiConversations();

  const totalConversations = conversations.reduce((s, c) => s + c.conversations, 0);
  const totalResolved = conversations.reduce((s, c) => s + c.resolved, 0);
  const totalEscalated = conversations.reduce((s, c) => s + c.escalated, 0);
  const resolutionRate = ((totalResolved / totalConversations) * 100).toFixed(1);

  const columns = [
    { key: "patientName", label: "Patient", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "summary", label: "Summary" },
    { key: "messageCount", label: "Messages", sortable: true },
    {
      key: "resolved",
      label: "Resolved",
      render: (item: Record<string, unknown>) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RESOLVED_BADGES[String(item.resolved)] ?? ""}`}>
          {item.resolved ? "Yes" : "No"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Analytics</h1>
          <p className="text-sm text-muted-foreground">AI assistant performance and conversation metrics</p>
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
        <AnalyticsStatCard icon={Bot} label="Total Conversations" value={totalConversations} change="+22.4%" changeType="up" color="bg-indigo-500" />
        <AnalyticsStatCard icon={CheckCircle} label="Resolved" value={totalResolved} change="+18.2%" changeType="up" color="bg-green-500" />
        <AnalyticsStatCard icon={AlertTriangle} label="Escalated" value={totalEscalated} change="-5.1%" changeType="down" color="bg-amber-500" />
        <AnalyticsStatCard icon={TrendingUp} label="Resolution Rate" value={`${resolutionRate}%`} change="+3.4%" changeType="up" color="bg-cyan-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsAreaChart
          title="AI Conversations"
          subtitle="Daily conversation volume and resolution"
          data={conversations}
          xKey="date"
          areas={[
            { dataKey: "resolved", color: "#22c55e", name: "Resolved", stackId: "1" },
            { dataKey: "escalated", color: "#f59e0b", name: "Escalated", stackId: "1" },
          ]}
        />

        <AnalyticsBarChart
          title="Conversations by Hour"
          subtitle="Peak usage hours"
          data={hours}
          xKey="hour"
          bars={[{ dataKey: "count", color: "#6366f1", name: "Conversations" }]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AnalyticsRadialChart
          title="AI Performance Metrics"
          subtitle="Key performance indicators"
          data={performance.map((p) => ({
            name: p.metric,
            value: p.value,
            fill: p.value >= 90 ? "#22c55e" : p.value >= 80 ? "#f59e0b" : "#ef4444",
          }))}
        />

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold">Recent AI Conversations</h3>
          <DataTable
            columns={columns}
            data={recentConvos as unknown as Record<string, unknown>[]}
            pageSize={5}
            searchPlaceholder="Search conversations..."
          />
        </div>
      </div>
    </div>
  );
}
