import type { ReactElement, ReactNode } from "react";

type EmptyStateProps = {
  icon: React.ElementType;
  title?: string;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps): ReactElement {
  return (
    <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground/40" />
      {title && <h3 className="mt-3 text-sm font-medium text-foreground">{title}</h3>}
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
