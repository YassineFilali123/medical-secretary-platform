import { useState } from "react";
import { Sliders, AlertTriangle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";

const categoryTabs = [
  { id: "parameters", label: "AI Parameters", icon: Sliders },
  { id: "escalation", label: "Escalation Rules", icon: AlertTriangle },
  { id: "responses", label: "Default Responses", icon: MessageSquare },
];

export default function AiConfigurationPage() {
  const [activeTab, setActiveTab] = useState("parameters");
  const parameters = adminService.getAiParameters();
  const escalationRules = adminService.getEscalationRules();
  const defaultResponses = adminService.getDefaultResponses();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">AI Configuration</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categoryTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "parameters" && (
        <div className="rounded-2xl border border-border bg-card shadow-soft">
          <div className="border-b border-border px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">AI Model Parameters</h2>
            </div>
            <Button className="rounded-xl bg-gradient-primary text-xs h-8">Save Changes</Button>
          </div>
          <div className="divide-y divide-border">
            {parameters.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-xs text-muted-foreground">{p.description}</div>
                </div>
                <div className="ml-4">
                  {p.type === "boolean" ? (
                    <input type="checkbox" defaultChecked={p.value === true} className="h-4 w-4 rounded border-primary text-primary" />
                  ) : p.type === "select" ? (
                    <select defaultValue={p.value as string} className="h-9 rounded-lg border border-input bg-background px-2 text-sm min-w-[140px]">
                      {(p.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type={p.type === "number" ? "number" : "text"} defaultValue={p.value as string | number}
                      className="h-9 rounded-lg border border-input bg-background px-3 text-sm w-24 text-right" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "escalation" && (
        <div className="rounded-2xl border border-border bg-card shadow-soft">
          <div className="border-b border-border px-5 py-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Escalation Rules</h2>
          </div>
          <div className="divide-y divide-border">
            {escalationRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex-1">
                  <div className="text-sm font-medium">{rule.condition}</div>
                  <div className="text-xs text-muted-foreground">{rule.action}</div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  rule.priority === "critical" ? "bg-red-100 text-red-700" : rule.priority === "high" ? "bg-amber-100 text-amber-700" : rule.priority === "medium" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                }`}>{rule.priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "responses" && (
        <div className="rounded-2xl border border-border bg-card shadow-soft">
          <div className="border-b border-border px-5 py-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Default Responses</h2>
          </div>
          <div className="divide-y divide-border">
            {defaultResponses.map((r) => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">{r.trigger}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">{r.response}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
