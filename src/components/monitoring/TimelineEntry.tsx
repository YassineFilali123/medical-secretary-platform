import { MessageSquare, ArrowRightLeft, StickyNote, AlertTriangle, RefreshCw } from "lucide-react";
import type { TimelineEntry as TimelineEntryType } from "@/types/monitoring";

const ICON_MAP: Record<TimelineEntryType["type"], React.ElementType> = {
  message: MessageSquare,
  status_change: RefreshCw,
  transfer: ArrowRightLeft,
  note: StickyNote,
  escalation: AlertTriangle,
};

const COLOR_MAP: Record<TimelineEntryType["type"], string> = {
  message: "bg-blue-50 text-blue-600",
  status_change: "bg-purple-50 text-purple-600",
  transfer: "bg-amber-50 text-amber-600",
  note: "bg-green-50 text-green-600",
  escalation: "bg-red-50 text-red-600",
};

type TimelineEntryProps = {
  entry: TimelineEntryType;
};

export function TimelineEntry({ entry }: TimelineEntryProps) {
  const Icon = ICON_MAP[entry.type];
  const color = COLOR_MAP[entry.type];

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium">{entry.description}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{entry.actor}</span>
          <span>·</span>
          <span>
            {new Date(entry.timestamp).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
