import type { ConversationStatus, EmergencyStatus, CallStatus } from "@/types/monitoring";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  waiting: "bg-amber-100 text-amber-700",
  transferred: "bg-blue-100 text-blue-700",
  closed: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  connected: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  missed: "bg-red-100 text-red-700",
};

type StatusBadgeProps = {
  status: ConversationStatus | EmergencyStatus | CallStatus;
  className?: string;
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${style} ${className}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
