import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  MessageSquare,
  Trash2,
  Pencil,
  Calendar,
  Clock,
  ArrowRight,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiAssistantService } from "@/services/ai-assistant";
import type { Conversation } from "@/types/ai-assistant";
import { ROUTES } from "@/constants/routes";

export default function AiConversationHistory() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState(() =>
    aiAssistantService.getConversations()
  );
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = search
    ? aiAssistantService.searchConversations(search)
    : conversations;

  const refresh = () => setConversations(aiAssistantService.getConversations());

  const handleDelete = (id: string) => {
    aiAssistantService.deleteConversation(id);
    refresh();
    setDeleteConfirmId(null);
  };

  const handleRenameStart = (c: Conversation) => {
    setEditingId(c.id);
    setEditValue(c.title);
  };

  const handleRenameSubmit = (id: string) => {
    if (editValue.trim()) {
      aiAssistantService.renameConversation(id, editValue.trim());
      refresh();
    }
    setEditingId(null);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => navigate(ROUTES.AI_ASSISTANT_HOME)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Conversation History
          </h1>
          <p className="text-sm text-muted-foreground">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          className="h-10 rounded-xl pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <Bot className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              {search
                ? "No conversations match your search."
                : "No conversations yet. Start a new chat!"}
            </p>
            {!search && (
              <Button
                className="mt-4 rounded-xl bg-gradient-primary text-white"
                onClick={() => navigate(ROUTES.AI_ASSISTANT_CHAT)}
              >
                Start New Chat
              </Button>
            )}
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className="group rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:border-primary/20 hover:shadow-elevated"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-soft">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  {editingId === c.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full rounded-lg border border-primary bg-transparent px-2 py-1 text-sm font-semibold outline-none"
                    />
                  ) : (
                    <p className="text-sm font-semibold">{c.title}</p>
                  )}
                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(c.updatedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(c.updatedAt)}
                    </span>
                    <span>
                      {c.messages.length} message{c.messages.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {c.messages.length > 0 && (
                    <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                      {c.messages
                        .filter((m) => m.role === "user")
                        .slice(0, 1)
                        .map((m) => m.content)}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRenameStart(c)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {deleteConfirmId === c.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-lg text-xs text-destructive"
                        onClick={() => handleDelete(c.id)}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-lg text-xs"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      navigate(`${ROUTES.AI_ASSISTANT_CHAT}/${c.id}`)
                    }
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
