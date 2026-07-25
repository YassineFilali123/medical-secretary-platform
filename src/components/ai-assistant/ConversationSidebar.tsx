import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MessageSquare, Trash2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Conversation } from "@/types/ai-assistant";
import { ROUTES } from "@/constants/routes";

type ConversationSidebarProps = {
  conversations: Conversation[];
  activeId?: string;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  isOpen: boolean;
  onClose: () => void;
};

export function ConversationSidebar({
  conversations,
  activeId,
  onNewChat,
  onDelete,
  onRename,
  isOpen,
  onClose,
}: ConversationSidebarProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const filtered = search
    ? conversations.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.messages.some((m) => m.content.toLowerCase().includes(search.toLowerCase()))
      )
    : conversations;

  const handleRenameStart = (c: Conversation) => {
    setEditingId(c.id);
    setEditValue(c.title);
  };

  const handleRenameSubmit = (id: string) => {
    if (editValue.trim()) {
      onRename(id, editValue.trim());
    }
    setEditingId(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform duration-300 lg:relative lg:z-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onNewChat}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 lg:hidden"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="h-9 rounded-xl pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground/40" />
              <p className="mt-2 text-xs text-muted-foreground">No conversations found</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors ${
                    activeId === c.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      navigate(`${ROUTES.AI_ASSISTANT_CHAT}/${c.id}`);
                      onClose();
                    }}
                  >
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
                        className="w-full rounded bg-transparent text-sm font-medium outline-none ring-1 ring-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <p className="truncate text-sm font-medium">{c.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(c.updatedAt)}
                        </p>
                      </>
                    )}
                  </button>

                  {editingId !== c.id && (
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameStart(c);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(c.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
