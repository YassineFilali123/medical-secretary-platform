import { Link } from "react-router-dom";
import { ArrowRight, Brain, Info, Stethoscope } from "lucide-react";
import { UserSettings } from "@/components/shared/UserSettings";

/**
 * Administrator settings.
 *
 * This page used to render five tabs of settings (general, security, email,
 * notifications, backup) driven entirely by a mock service, with a "Save All
 * Changes" button that saved nothing and a password field pre-filled with a
 * fake SMTP password. None of it was backed by a table or an endpoint, so it
 * has been removed rather than left looking operational.
 *
 * What remains is the theme preference (which really persists) plus links to
 * the configuration screens that are genuinely wired to the backend.
 */

const REAL_CONFIG = [
  {
    to: "/admin/ai-config",
    icon: Brain,
    title: "AI Configuration",
    description: "Assistant messages, FAQ usage, and the Gemini connection status.",
  },
  {
    to: "/admin/specialties",
    icon: Stethoscope,
    title: "Specialties",
    description: "The specialties doctors can be assigned to.",
  },
] as const;

export default function SystemSettingsPage() {
  return (
    <div className="space-y-6">
      <UserSettings />

      <div className="max-w-2xl space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-base font-semibold">Platform configuration</h2>
          <div className="space-y-2">
            {REAL_CONFIG.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-4 hover:bg-accent/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Database, SMTP and API credentials are read from{" "}
            <code className="font-mono">backend/.env</code> and{" "}
            <code className="font-mono">backend/api/config.php</code> on the server. They are
            deliberately not editable from the browser.
          </span>
        </div>
      </div>
    </div>
  );
}
