import { Calendar } from "lucide-react";
import type { DateRange } from "@/types/analytics";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

type DateRangeFilterProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
};

export function DateRangeFilter({
  value,
  onChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      {DATE_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === range.value
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground hover:bg-accent"
          }`}
        >
          {range.label}
        </button>
      ))}
      {value === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate ?? ""}
            onChange={(e) => onStartDateChange?.(e.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate ?? ""}
            onChange={(e) => onEndDateChange?.(e.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}
    </div>
  );
}
