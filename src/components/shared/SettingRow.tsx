import type { ReactElement, ReactNode } from "react";

type SettingRowProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  children: ReactNode;
};

export function SettingRow({ icon: Icon, title, description, children }: SettingRowProps): ReactElement {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
