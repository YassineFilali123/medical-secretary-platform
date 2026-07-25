import {
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartCard } from "./ChartCard";

type AreaConfig = {
  dataKey: string;
  color: string;
  name: string;
  stackId?: string;
  fillOpacity?: number;
};

type AnalyticsAreaChartProps = {
  title: string;
  subtitle?: string;
  data: Record<string, string | number>[];
  xKey: string;
  areas: AreaConfig[];
  height?: number;
  className?: string;
};

export function AnalyticsAreaChart({
  title,
  subtitle,
  data,
  xKey,
  areas,
  height = 280,
  className,
}: AnalyticsAreaChartProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <ReAreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {areas.map((area) => (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              stackId={area.stackId}
              stroke={area.color}
              fill={area.color}
              fillOpacity={area.fillOpacity ?? 0.3}
              name={area.name}
            />
          ))}
        </ReAreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
