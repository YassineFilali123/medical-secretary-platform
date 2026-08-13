import { Bell, Moon, Shield, Sun } from "lucide-react";
import { SettingRow } from "@/components/shared/SettingRow";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/contexts/ThemeContext";

/**
 * Per-user settings.
 *
 * Only the theme is offered, because it is the only preference the platform
 * actually stores (ThemeContext persists it). The page previously also showed a
 * language selector and three notification checkboxes; none of them were saved
 * anywhere — no settings table, endpoint or service exists — so they were
 * removed rather than left looking functional.
 *
 * Shared by the patient, doctor and secretary settings pages so there is one
 * implementation instead of three copies.
 */
export function UserSettings() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const ThemeIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <ThemeIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Theme
        </h2>
        <SettingRow
          icon={ThemeIcon}
          title="Color Theme"
          description="Switch between light and dark mode"
        >
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemePreference)}
            aria-label="Color theme"
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm focus-ring"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </SettingRow>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
          <Bell className="h-4 w-4 text-primary" aria-hidden="true" /> Notifications
        </h2>
        <p className="text-sm text-muted-foreground">
          You receive a notification for appointments, documents, consultations and live chat
          messages. Per-category preferences are not configurable yet.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Shield className="h-4 w-4 text-primary" aria-hidden="true" /> Privacy
        </h2>
        <p className="text-sm text-muted-foreground">
          Your medical data is handled according to HIPAA and GDPR standards. We never share your
          information without explicit consent.
        </p>
        <div className="mt-4 rounded-xl bg-primary/5 p-3">
          <Label className="text-xs text-muted-foreground">
            To request a copy of your data or delete your account, contact the clinic
            administrator.
          </Label>
        </div>
      </div>
    </div>
  );
}
