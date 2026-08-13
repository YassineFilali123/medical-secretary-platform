
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  User,
  UserCheck,
  Stethoscope,
  MessageSquare,
  Calendar,
  Brain,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type DoctorAiMessage } from "@/services/doctor-conversations";
import { useDoctorConversationQuery } from "@/hooks/queries/useDoctorQueries";
import type { AiConversationStatus } from "@/types/doctor";

const STATUS_CONFIG: Record<AiConversationStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  transferred: { label: "Transferred", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  waiting: { label: "Waiting", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

const ROLE_CONFIG: Record<
  DoctorAiMessage["role"],
  { icon: React.ElementType; align: "left" | "right"; bubbleClass: string; iconBg: string }
> = {
  patient: {
    icon: User,
    align: "left",
    bubbleClass: "bg-primary text-primary-foreground rounded-2xl rounded-tl-sm",
    iconBg: "bg-gradient-primary",
  },
  ai: {
    icon: Bot,
    align: "right",
    bubbleClass: "border border-border bg-muted rounded-2xl rounded-tr-sm",
    iconBg: "bg-gradient-health",
  },
  secretary: {
    icon: UserCheck,
    align: "right",
    bubbleClass:
      "border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 rounded-2xl rounded-tr-sm",
    iconBg: "bg-amber-500",
  },
  doctor: {
    icon: Stethoscope,
    align: "left",
    bubbleClass:
      "border border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 rounded-2xl rounded-tl-sm",
    iconBg: "bg-blue-500",
  },
};

/** The API returns "YYYY-MM-DD HH:MM:SS"; Safari will not parse that as-is. */
function parseDate(value: string): Date {
  return new Date(value.replace(" ", "T"));
}

function formatDateTime(value: string): string {
  const d = parseDate(value);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
}

function formatDateOnly(value: string): string {
  return parseDate(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function AiConversationDetailPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const parsedId = Number(conversationId);
  const validId = conversationId && Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;

  // A conversation belonging to another doctor's patient comes back as a 404
  // from the server — the browser is not what decides access here.
  const { data, isPending, error: queryError } = useDoctorConversationQuery(validId);

  const conversation = data?.conversation ?? null;
  const messages: DoctorAiMessage[] = data?.messages ?? [];
  const loading = validId !== null && isPending;
  const error =
    validId === null
      ? "Invalid conversation reference."
      : queryError instanceof Error
        ? queryError.message
        : queryError
          ? "Could not load this conversation."
          : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading conversation…
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <Brain className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">
            {error ?? "Conversation not found."}
          </p>
          <Button
            variant="outline"
            className="mt-4 rounded-xl"
            onClick={() => navigate("/doctor/ai-conversations")}
          >
            View all conversations
          </Button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[conversation.status] ?? STATUS_CONFIG.closed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => navigate("/doctor/ai-conversations")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight truncate">
              {conversation.patientName}
            </h1>
            <Badge className={`shrink-0 text-[11px] font-medium ${statusCfg.color}`}>
              {statusCfg.label}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDateOnly(conversation.startedAt)}</span>
            <span className="text-muted-foreground/40">·</span>
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{conversation.messageCount} messages</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Messages column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4" /> Conversation Messages
              </h3>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Eye className="h-3.5 w-3.5" /> Read only
              </span>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No messages in this conversation.
                </p>
              ) : (
                messages.map((msg) => {
                  const roleCfg = ROLE_CONFIG[msg.role] ?? ROLE_CONFIG.ai;
                  const Icon = roleCfg.icon;
                  const isLeft = roleCfg.align === "left";

                  return (
                    <div key={msg.id} className={`flex gap-3 ${isLeft ? "" : "flex-row-reverse"}`}>
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${roleCfg.iconBg}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className={`max-w-[75%] ${roleCfg.bubbleClass} px-4 py-2.5`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-semibold opacity-80">
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] opacity-50">
                            {formatDateTime(msg.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Conversation Info */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold">Details</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <Badge className={`text-[11px] font-medium ${statusCfg.color}`}>
                  {statusCfg.label}
                </Badge>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium text-foreground truncate">
                  {conversation.patientName}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Started</span>
                <span className="font-medium text-foreground">{conversation.date}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Messages</span>
                <span className="font-medium text-foreground">{conversation.messageCount}</span>
              </div>
              {conversation.closedAt && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Closed</span>
                  <span className="font-medium text-foreground">
                    {conversation.closedAt.slice(0, 10)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Secretary hand-off — only when one actually happened */}
          {conversation.secretaryName && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <UserCheck className="h-4 w-4" /> Transferred to Secretary
              </h3>
              <p className="text-sm text-muted-foreground">
                Handled by{" "}
                <span className="font-medium text-foreground">{conversation.secretaryName}</span>
                {conversation.acceptedAt && (
                  <> since {formatDateTime(conversation.acceptedAt)}</>
                )}
                .
              </p>
            </div>
          )}

          {/* Read-only notice */}
          <div className="rounded-2xl border border-border bg-muted/40 p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4" /> Read-only record
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This transcript is a record of what your patient discussed with the assistant. It
              cannot be edited or deleted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
