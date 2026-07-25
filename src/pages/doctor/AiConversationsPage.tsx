import { useState, useMemo } from "react";
import { Search, Brain, MessageSquare, ChevronRight, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { doctorService } from "@/services/doctor";

const MOCK_MESSAGES: Record<string, { role: string; content: string }[]> = {
  c1: [
    { role: "patient", content: "I've been experiencing some dizziness since starting the new medication." },
    { role: "ai", content: "I understand your concern. Dizziness can be a side effect of Lisinopril, especially in the first few weeks. Have you noticed it getting better or worse over time?" },
    { role: "patient", content: "It's been about 5 days and it's still there. Should I stop taking it?" },
    { role: "ai", content: "Please do not stop taking your medication without consulting Dr. Chen first. I've noted this in your file and will flag it for the doctor. In the meantime, try taking it at bedtime to minimize dizziness during the day." },
    { role: "doctor", content: "I've reviewed John's messages. Let's keep the current dosage but add a follow-up in 2 weeks to reassess. The dizziness should subside." },
  ],
  c2: [
    { role: "patient", content: "I've been feeling my heart race when I drink coffee. Is that normal?" },
    { role: "ai", content: "Caffeine can trigger palpitations in some people, especially those with arrhythmia. I'd suggest reducing your caffeine intake and monitoring your symptoms." },
  ],
};

export default function AiConversationsPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const conversations = useMemo(() => doctorService.getConversations(), []);
  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    return conversations.filter((c) => c.patientName.toLowerCase().includes(search.toLowerCase()));
  }, [conversations, search]);

  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">AI Conversations</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search conversations..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{c.patientName}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{c.summary}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Calendar className="h-3 w-3" /> {c.date}
                <span>&middot;</span>
                <MessageSquare className="h-3 w-3" /> {c.messageCount} messages
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedConv ? (
            <div className="rounded-2xl border border-border bg-card shadow-soft">
              <div className="border-b border-border p-4">
                <h2 className="text-base font-semibold">{selectedConv.patientName}</h2>
                <p className="text-xs text-muted-foreground">{selectedConv.date} &middot; AI-generated summary</p>
              </div>

              <div className="space-y-3 p-4">
                {(MOCK_MESSAGES[selectedConv.id] ?? []).map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "patient" ? "" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "patient"
                        ? "rounded-bl-sm bg-muted text-foreground"
                        : msg.role === "doctor"
                        ? "rounded-br-sm bg-primary/10 text-primary-foreground border border-primary/20"
                        : "rounded-br-sm bg-gradient-health/10 text-foreground border border-secondary/20"
                    }`}>
                      <div className="mb-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                        {msg.role === "doctor" ? "Dr. Chen" : msg.role}
                      </div>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border p-4">
                <div className="rounded-xl bg-primary/5 p-3">
                  <h3 className="text-sm font-medium flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> AI Summary</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedConv.summary}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-border bg-card shadow-soft">
              <div className="text-center">
                <Brain className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Select a conversation to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
