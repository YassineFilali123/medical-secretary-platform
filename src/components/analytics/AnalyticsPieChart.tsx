import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartCard } from "./ChartCard";

type PieData = {
  name: string;
  value: number;
  fill: string;
};

type AnalyticsPieChartProps = {
  title: string;
  subtitle?: string;
  data: PieData[];
  height?: number;
  className?: string;
  innerRadius?: number;
  outerRadius?: number;
};

export function AnalyticsPieChart({
  title,
  subtitle,
  data,
  height = 280,
  className,
  innerRadius = 60,
  outerRadius = 100,
}: AnalyticsPieChartProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RePieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </RePieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
