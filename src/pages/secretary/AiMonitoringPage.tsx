import { useState, useMemo } from "react";
import { Search, Brain, AlertTriangle, CheckCircle, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { secretaryService } from "@/services/secretary";

const MOCK_CORRECTIONS: Record<string, { original: string; corrected: string }> = {
  ai1: {
    original: "AI suggested patient take aspirin for chest pain",
    corrected: "Secretary corrected: Patient advised to go to ER immediately for chest pain evaluation",
  },
  ai3: {
    original: "AI recommended antihistamine for symptoms",
    corrected: "Secretary escalated: Emergency response dispatched for suspected anaphylaxis",
  },
};

export default function AiMonitoringPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const conversations = useMemo(() => secretaryService.getAIConversations(), []);
  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    return conversations.filter((c) => c.patientName.toLowerCase().includes(search.toLowerCase()));
  }, [conversations, search]);

  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );

  const avgConfidence = secretaryService.getAverageConfidence();
  const escalatedCount = secretaryService.getEscalatedCount();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">AI Monitoring</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Avg Confidence</span>
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div className={`mt-2 text-2xl font-semibold ${avgConfidence >= 80 ? "text-green-600" : avgConfidence >= 70 ? "text-amber-500" : "text-destructive"}`}>
            {avgConfidence}%
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Escalations</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-500">{escalatedCount}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Conversations</span>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{conversations.length}</div>
        </div>
      </div>

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
                {c.escalated && <AlertTriangle className="h-4 w-4 text-destructive" />}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${c.confidence >= 80 ? "bg-green-500" : c.confidence >= 70 ? "bg-amber-500" : "bg-destructive"}`}
                    style={{ width: `${c.confidence}%` }} />
                </div>
                <span className={`text-xs font-medium ${c.confidence >= 80 ? "text-green-600" : c.confidence >= 70 ? "text-amber-500" : "text-destructive"}`}>
                  {c.confidence}%
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{c.summary}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedConv ? (
            <div className="rounded-2xl border border-border bg-card shadow-soft">
              <div className="border-b border-border p-4">
                <h2 className="text-base font-semibold">{selectedConv.patientName}</h2>
                <p className="text-xs text-muted-foreground">{selectedConv.date} &middot; {selectedConv.messageCount} messages</p>
              </div>

              <div className="p-4 space-y-4">
                <div className="rounded-xl bg-primary/5 p-4">
                  <h3 className="text-sm font-medium flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> AI Summary</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedConv.summary}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-xs text-muted-foreground">Confidence Score</div>
                    <div className={`mt-1 text-lg font-semibold ${selectedConv.confidence >= 80 ? "text-green-600" : selectedConv.confidence >= 70 ? "text-amber-500" : "text-destructive"}`}>
                      {selectedConv.confidence}%
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${selectedConv.confidence >= 80 ? "bg-green-500" : selectedConv.confidence >= 70 ? "bg-amber-500" : "bg-destructive"}`}
                        style={{ width: `${selectedConv.confidence}%` }} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="mt-1 flex items-center gap-2">
                      {selectedConv.escalated ? (
                        <><AlertTriangle className="h-5 w-5 text-destructive" /><span className="text-sm font-medium text-destructive">Escalated to Human</span></>
                      ) : (
                        <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-sm font-medium text-green-600">Handled by AI</span></>
                      )}
                    </div>
                  </div>
                </div>

                {selectedConv.id && (() => {
                  const correction = MOCK_CORRECTIONS[selectedConv.id];
                  if (!correction) return null;
                  return (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                      <h3 className="text-sm font-medium flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-4 w-4" /> Manual Correction Applied
                      </h3>
                      <div className="mt-2 space-y-2">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground">AI Response</div>
                          <div className="text-sm text-muted-foreground line-through">{correction.original}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-green-600">Corrected</div>
                          <div className="text-sm">{correction.corrected}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="rounded-xl border border-border p-4">
                  <h3 className="text-sm font-medium mb-2">Manual Correction</h3>
                  <textarea
                    className="w-full min-h-[80px] rounded-xl border border-input bg-background p-3 text-sm resize-none"
                    placeholder="Type your correction or note for the AI response..."
                  />
                  <div className="mt-2 flex justify-end">
                    <button className="rounded-xl bg-gradient-primary px-4 py-2 text-xs font-medium text-white shadow-soft transition-opacity hover:opacity-90">
                      Submit Correction
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-border bg-card shadow-soft">
              <div className="text-center">
                <Brain className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Select an AI conversation to monitor</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
