import { useState } from "react";
import { MessageSquare, Plus, Edit3, Trash2, Eye, ToggleLeft, ToggleRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";

const categoryColors: Record<string, string> = {
  symptom: "bg-blue-100 text-blue-700",
  medication: "bg-purple-100 text-purple-700",
  appointment: "bg-green-100 text-green-700",
  emergency: "bg-red-100 text-red-700",
  general: "bg-gray-100 text-gray-600",
};

export default function ConversationScenariosPage() {
  const [scenarios] = useState(() => adminService.getScenarios());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = scenarios.find((s) => s.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Conversation Scenarios</h1>
        <Button className="rounded-xl bg-gradient-primary gap-1.5">
          <Plus className="h-4 w-4" /> Add Scenario
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-2">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full rounded-xl border border-border p-4 text-left transition-colors ${
                selectedId === s.id ? "border-primary bg-primary/5" : "hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{s.title}</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColors[s.category]}`}>{s.category}</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{s.description}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs font-medium ${s.active ? "text-green-600" : "text-muted-foreground"}`}>
                  {s.active ? "Active" : "Inactive"}
                </span>
                <div className="flex gap-1">
                  <button className="rounded-lg p-1 text-muted-foreground hover:bg-accent"><Eye className="h-3.5 w-3.5" /></button>
                  <button className="rounded-lg p-1 text-muted-foreground hover:bg-accent"><Edit3 className="h-3.5 w-3.5" /></button>
                  <button className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="rounded-2xl border border-border bg-card shadow-soft">
              <div className="border-b border-border px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">{selected.title}</h2>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${categoryColors[selected.category]}`}>{selected.category}</span>
                </div>
                <button className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent">
                  {selected.active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
              </div>
              <div className="p-5 space-y-3">
                {selected.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "patient" ? "" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "patient"
                        ? "rounded-bl-sm bg-muted text-foreground"
                        : "rounded-br-sm bg-gradient-health/10 text-foreground border border-secondary/20"
                    }`}>
                      <div className="mb-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                        {msg.role === "ai" ? <Bot className="inline h-3 w-3 mr-0.5" /> : null}
                        {msg.role}
                      </div>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                {selected.messages.length} messages in scenario
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card shadow-soft">
              <div className="text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">Select a scenario to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
