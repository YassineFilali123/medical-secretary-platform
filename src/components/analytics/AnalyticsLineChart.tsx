import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartCard } from "./ChartCard";

type LineConfig = {
  dataKey: string;
  color: string;
  name: string;
  strokeWidth?: number;
};

type AnalyticsLineChartProps = {
  title: string;
  subtitle?: string;
  data: Record<string, string | number>[];
  xKey: string;
  lines: LineConfig[];
  height?: number;
  className?: string;
  yAxisDomain?: [number | string, number | string];
};

export function AnalyticsLineChart({
  title,
  subtitle,
  data,
  xKey,
  lines,
  height = 280,
  className,
  yAxisDomain,
}: AnalyticsLineChartProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <ReLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={yAxisDomain} />
          <Tooltip />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              strokeWidth={line.strokeWidth ?? 2}
              dot={{ fill: line.color }}
              name={line.name}
            />
          ))}
        </ReLineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
