import { useState } from "react";
import { Globe, Shield, Mail, Bell, Database, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";

const categoryTabs = [
  { id: "general", label: "General", icon: Globe },
  { id: "security", label: "Security", icon: Shield },
  { id: "email", label: "Email", icon: Mail },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "backup", label: "Backup", icon: Database },
];

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const settings = adminService.getSettingsByCategory(activeTab);
  const [theme, setTheme] = useState("light");

  const renderSetting = (s: typeof settings[0]) => {
    if (s.type === "boolean") {
      return <input type="checkbox" defaultChecked={s.value === true} className="h-4 w-4 rounded border-primary text-primary" />;
    }
    if (s.type === "select" && s.options) {
      return (
        <select defaultValue={s.value as string} className="h-9 rounded-lg border border-input bg-background px-2 text-sm min-w-[160px]">
          {s.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    if (s.type === "password") {
      return <input type="password" defaultValue={s.value as string} className="h-9 rounded-lg border border-input bg-background px-3 text-sm w-48" />;
    }
    return <input type={s.type === "number" ? "number" : "text"} defaultValue={s.value as string | number}
      className="h-9 rounded-lg border border-input bg-background px-3 text-sm w-48" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
        <Button className="rounded-xl bg-gradient-primary">Save All Changes</Button>
      </div>

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

      <div className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold capitalize">{activeTab} Settings</h2>
        </div>
        <div className="divide-y divide-border">
          {settings.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.key}</div>
              </div>
              <div>{renderSetting(s)}</div>
            </div>
          ))}
        </div>
      </div>

      {activeTab === "general" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-4 text-base font-semibold flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />} Theme
          </h2>
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <div className="text-sm font-medium">Color Theme</div>
              <div className="text-xs text-muted-foreground">Switch between light and dark mode</div>
            </div>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
