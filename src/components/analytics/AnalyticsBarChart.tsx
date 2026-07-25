import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartCard } from "./ChartCard";

type BarConfig = {
  dataKey: string;
  color: string;
  name: string;
  stackId?: string;
  radius?: [number, number, number, number];
};

type AnalyticsBarChartProps = {
  title: string;
  subtitle?: string;
  data: Record<string, string | number>[];
  xKey: string;
  bars: BarConfig[];
  height?: number;
  className?: string;
};

export function AnalyticsBarChart({
  title,
  subtitle,
  data,
  xKey,
  bars,
  height = 280,
  className,
}: AnalyticsBarChartProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <ReBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              fill={bar.color}
              stackId={bar.stackId}
              radius={bar.radius ?? [4, 4, 0, 0]}
              name={bar.name}
            />
          ))}
        </ReBarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
