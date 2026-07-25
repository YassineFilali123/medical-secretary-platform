import type { ReactElement } from "react";

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
};

export function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps): ReactElement {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
