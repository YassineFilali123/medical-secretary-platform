import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  User,
  MessageSquare,
  StickyNote,
  ArrowRightLeft,
  XCircle,
  CheckCircle,
  Send,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMonitoring } from "@/contexts/MonitoringContext";
import {
  PriorityBadge,
  StatusBadge,
  ConfidenceBar,
  LiveIndicator,
  TimelineEntry,
} from "@/components/monitoring";
import { monitoringService } from "@/services/monitoring";

const DOCTOR_OPTIONS = [
  "Dr. Sarah Chen",
  "Dr. James Wilson",
  "Dr. Maria Rodriguez",
  "Dr. Robert Brown",
  "Dr. Emily Davis",
  "Dr. Michael Lee",
];

export default function ConversationDetailPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { conversations, takeOver, transfer, closeConversation, addNote } = useMonitoring();

  const conversation = useMemo(
    () => conversations.find((c) => c.id === conversationId),
    [conversations, conversationId]
  );

  const messages = useMemo(
    () => (conversationId ? monitoringService.getMessages(conversationId) : []),
    [conversationId]
  );

  const timelineData = useMemo(
    () => (conversationId ? monitoringService.getTimeline(conversationId) : []),
    [conversationId]
  );

  const [noteText, setNoteText] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);

  if (!conversation) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">Conversation not found.</p>
        </div>
      </div>
    );
  }

  const handleAddNote = () => {
    if (noteText.trim()) {
      addNote(conversation.id, noteText.trim());
      setNoteText("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Conversation Details</h1>
            <LiveIndicator />
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{conversation.patientName}</span>
            <StatusBadge status={conversation.status} />
            <PriorityBadge priority={conversation.priority} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4" /> Messages
            </h3>
            <div className="max-h-[400px] space-y-4 overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === "patient" ? "" : "flex-row-reverse"}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                      msg.sender === "patient" ? "bg-gradient-primary" : "bg-gradient-health"
                    }`}
                  >
                    {msg.sender === "patient" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      msg.sender === "patient"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="mt-1 text-[11px] opacity-70">
                      {msg.senderName} ·{" "}
                      {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <StickyNote className="h-4 w-4" /> Add Note
            </h3>
            <div className="flex gap-2">
              <Input
                placeholder="Add a note to this conversation..."
                className="h-10 rounded-xl"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
              />
              <Button
                className="rounded-xl bg-gradient-primary text-white"
                onClick={handleAddNote}
                disabled={!noteText.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {conversation.notes.length > 0 && (
              <div className="mt-3 space-y-2">
                {conversation.notes.map((n, i) => (
                  <div key={i} className="rounded-xl bg-muted/50 p-3 text-xs">
                    {n}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold">AI Confidence</h3>
            <ConfidenceBar score={conversation.confidence} />
            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Assigned AI</span>
                <span className="font-medium text-foreground">{conversation.assignedAI}</span>
              </div>
              <div className="flex justify-between">
                <span>Messages</span>
                <span className="font-medium text-foreground">{conversation.messageCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Started</span>
                <span className="font-medium text-foreground">
                  {new Date(conversation.startedAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold">Quick Actions</h3>
            <div className="space-y-2">
              {conversation.status !== "active" && (
                <Button
                  className="w-full rounded-xl bg-gradient-health text-white"
                  onClick={() => takeOver(conversation.id, "Current Secretary")}
                >
                  <CheckCircle className="mr-1 h-4 w-4" /> Take Over
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => setShowTransfer(!showTransfer)}
              >
                <ArrowRightLeft className="mr-1 h-4 w-4" /> Transfer
              </Button>
              {showTransfer && (
                <div className="space-y-1.5 rounded-xl border border-border p-2">
                  {DOCTOR_OPTIONS.map((d) => (
                    <button
                      key={d}
                      className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-accent"
                      onClick={() => {
                        transfer(conversation.id, d);
                        setShowTransfer(false);
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
              <Button
                variant="destructive"
                className="w-full rounded-xl"
                onClick={() => {
                  closeConversation(conversation.id);
                  navigate(-1);
                }}
              >
                <XCircle className="mr-1 h-4 w-4" /> Close Conversation
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4" /> Timeline
            </h3>
            <div className="space-y-0">
              {timelineData.map((entry) => (
                <TimelineEntry key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
