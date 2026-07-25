import { Phone, Clock } from "lucide-react";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import type { CallQueueItem } from "@/types/monitoring";

type CallQueueItemRowProps = {
  call: CallQueueItem;
  onRemove: (id: string) => void;
};

export function CallQueueItemRow({ call, onRemove }: CallQueueItemRowProps) {
  const elapsed = Math.floor(
    (Date.now() - new Date(call.waitingSince).getTime()) / 1000
  );

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:shadow-elevated">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50">
        <Phone className="h-5 w-5 text-blue-600" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{call.patientName}</p>
          <StatusBadge status={call.status} />
          <PriorityBadge priority={call.priority} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {call.phone}
          </span>
          <span>{call.reason}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <Clock className="h-3 w-3" />
          {elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m`}
        </div>
        <p className="text-[11px] text-muted-foreground">~{call.estimatedWait}m wait</p>
        <button
          onClick={() => onRemove(call.id)}
          className="mt-1 rounded-lg bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive hover:bg-destructive/20"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
