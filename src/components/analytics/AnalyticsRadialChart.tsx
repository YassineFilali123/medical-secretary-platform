import {
  RadialBarChart,
  RadialBar,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartCard } from "./ChartCard";

type RadialData = {
  name: string;
  value: number;
  fill: string;
};

type AnalyticsRadialChartProps = {
  title: string;
  subtitle?: string;
  data: RadialData[];
  height?: number;
  className?: string;
};

export function AnalyticsRadialChart({
  title,
  subtitle,
  data,
  height = 280,
  className,
}: AnalyticsRadialChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    index,
  }));

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="20%"
          outerRadius="80%"
          barSize={12}
          data={chartData}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={6}
          />
          <Tooltip />
          <Legend />
        </RadialBarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
