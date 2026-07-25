import type { ReactElement } from "react";

type SkeletonLoaderProps = {
  rows?: number;
  className?: string;
  variant?: "text" | "card" | "stat" | "table" | "chart";
};

export function SkeletonLoader({ rows = 3, className = "", variant = "card" }: SkeletonLoaderProps): ReactElement {
  if (variant === "stat") {
    return (
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="skeleton h-10 w-10 rounded-xl" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="skeleton h-7 w-20 rounded-md" />
              <div className="skeleton h-4 w-32 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className={`grid gap-4 lg:grid-cols-2 ${className}`}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="skeleton mb-4 h-4 w-40 rounded-md" />
            <div className="skeleton h-64 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={`rounded-2xl border border-border bg-card p-5 shadow-soft ${className}`}>
        <div className="skeleton mb-4 h-4 w-32 rounded-md" />
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-4 flex-1 rounded-md" />
              <div className="skeleton h-4 w-24 rounded-md" />
              <div className="skeleton h-4 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="skeleton h-4 w-3/4 rounded-md" />
            <div className="skeleton mt-2 h-3 w-1/2 rounded-md" />
            <div className="skeleton mt-4 h-20 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-4 w-full rounded-md" style={{ width: `${85 - i * 10}%` }} />
      ))}
    </div>
  );
}
