import { useState, useMemo } from "react";
import { Search, MessageSquare, Phone, UserCheck, ArrowRight, XCircle, Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { secretaryService } from "@/services/secretary";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  waiting: "bg-amber-100 text-amber-700",
  closed: "bg-gray-100 text-gray-500",
};

export default function LiveConversationsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const conversations = useMemo(() => secretaryService.getConversations(), []);
  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch = c.patientName.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || c.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [conversations, search, filter]);

  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Live Conversations</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search conversations..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            {["all", "active", "waiting", "closed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full rounded-xl border border-border p-3 text-left transition-colors ${
                selectedId === c.id ? "border-primary bg-primary/5" : "hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.patientName}</span>
                  {c.priority === "high" && <span className="h-2 w-2 rounded-full bg-destructive" />}
                  {c.unread > 0 && (
                    <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                      {c.unread}
                    </span>
                  )}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[c.status]}`}>{c.status}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.lastMessage}</p>
              <div className="mt-1.5 text-[10px] text-muted-foreground">
                {c.lastMessageTime} {c.assignedDoctor ? `\u00b7 ${c.assignedDoctor}` : ""}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No conversations found.</p>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedConv ? (
            <div className="rounded-2xl border border-border bg-card shadow-soft">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <h2 className="text-base font-semibold">{selectedConv.patientName}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedConv.assignedDoctor ? `Assigned to ${selectedConv.assignedDoctor}` : "Unassigned"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button aria-label="Call patient" className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button aria-label="Assign doctor" className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                    <UserCheck className="h-4 w-4" />
                  </button>
                  <button aria-label="Transfer call" className="rounded-lg bg-amber-100 p-2 text-amber-700 hover:bg-amber-200">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button aria-label="Close conversation" className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/20">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 p-4 max-h-[500px] overflow-y-auto">
                {selectedConv.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "patient" ? "" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "patient"
                        ? "rounded-bl-sm bg-muted text-foreground"
                        : msg.role === "secretary"
                        ? "rounded-br-sm bg-primary/10 text-foreground border border-primary/20"
                        : msg.role === "doctor"
                        ? "rounded-br-sm bg-green-50 text-foreground border border-green-200"
                        : "rounded-br-sm bg-gradient-health/10 text-foreground border border-secondary/20"
                    }`}>
                      <div className="mb-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                        {msg.role === "ai" ? <Bot className="inline h-3 w-3 mr-0.5" /> : null}
                        {msg.role === "patient" ? selectedConv.patientName.split(" ")[0] : msg.role === "secretary" ? "You" : msg.role === "doctor" ? msg.role : "AI"}
                      </div>
                      {msg.content}
                      <div className="mt-1 text-[10px] text-muted-foreground text-right">{msg.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border p-4">
                <div className="flex items-center gap-2">
                  <Input placeholder="Type a message..." className="h-10 rounded-xl" />
                  <button className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-white shadow-soft transition-opacity hover:opacity-90">
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-border bg-card shadow-soft">
              <div className="text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Select a conversation to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
