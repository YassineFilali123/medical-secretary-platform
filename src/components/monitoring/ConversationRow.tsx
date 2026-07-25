import { useNavigate } from "react-router-dom";
import { Clock, Bot, MessageSquare } from "lucide-react";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import type { MonitoringConversation } from "@/types/monitoring";

type ConversationRowProps = {
  conversation: MonitoringConversation;
};

export function ConversationRow({ conversation }: ConversationRowProps) {
  const navigate = useNavigate();
  const c = conversation;

  const formatWait = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <button
      onClick={() => navigate(`/secretary/conversations/${c.id}`)}
      className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-all hover:border-primary/20 hover:shadow-elevated"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-soft text-sm font-bold text-primary">
        {c.patientName.charAt(0)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{c.patientName}</p>
          <StatusBadge status={c.status} />
          <PriorityBadge priority={c.priority} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Bot className="h-3 w-3" />
            {c.assignedAI}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {c.messageCount}
          </span>
          {c.waitingTime > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <Clock className="h-3 w-3" />
              {formatWait(c.waitingTime)}
            </span>
          )}
          <span>{c.summary}</span>
        </div>
      </div>

      <div className="text-right text-xs text-muted-foreground">
        {new Date(c.lastActivity).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </button>
  );
}
