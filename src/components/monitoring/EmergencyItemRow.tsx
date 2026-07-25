import { AlertTriangle, User, CheckCircle } from "lucide-react";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import type { EmergencyQueueItem } from "@/types/monitoring";

type EmergencyItemRowProps = {
  emergency: EmergencyQueueItem;
  onResolve: (id: string) => void;
};

export function EmergencyItemRow({ emergency, onResolve }: EmergencyItemRowProps) {
  const e = emergency;

  return (
    <div className={`rounded-2xl border bg-card p-4 shadow-soft transition-all hover:shadow-elevated ${
      e.priority === "critical" ? "border-red-200" : "border-border"
    }`}>
      <div className="flex items-start gap-4">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
          e.priority === "critical" ? "bg-red-50" : "bg-orange-50"
        }`}>
          <AlertTriangle className={`h-5 w-5 ${
            e.priority === "critical" ? "text-red-600" : "text-orange-600"
          }`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{e.patientName}</p>
            <StatusBadge status={e.status} />
            <PriorityBadge priority={e.priority} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{e.reason}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {e.assignedDoctor}
            </span>
            <span>Severity: {e.severity}/10</span>
            <span>
              {new Date(e.createdAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {e.status !== "resolved" && (
          <button
            onClick={() => onResolve(e.id)}
            className="flex shrink-0 items-center gap-1 rounded-xl bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
          >
            <CheckCircle className="h-3 w-3" />
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}
