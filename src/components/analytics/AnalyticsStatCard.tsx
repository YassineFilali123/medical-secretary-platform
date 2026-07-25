import type { ReactElement } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type AnalyticsStatCardProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  change: string;
  changeType: "up" | "down" | "neutral";
  color: string;
};

export function AnalyticsStatCard({
  icon: Icon,
  label,
  value,
  change,
  changeType,
  color,
}: AnalyticsStatCardProps): ReactElement {
  const changeColor =
    changeType === "up"
      ? "text-green-600"
      : changeType === "down"
      ? "text-red-600"
      : "text-muted-foreground";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium ${changeColor}`}>
          {changeType === "up" && <TrendingUp className="h-3 w-3" />}
          {changeType === "down" && <TrendingDown className="h-3 w-3" />}
          {changeType === "neutral" && <Minus className="h-3 w-3" />}
          {change}
        </span>
      </div>
      <div className="mt-4">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
