import { useState } from "react";
import { Bell, Globe, Moon, Sun, Shield } from "lucide-react";
import { SettingRow } from "@/components/shared/SettingRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/contexts/ThemeContext";

export default function PatientSettingsPage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [language, setLanguage] = useState("en");
  const [notifyApps, setNotifyApps] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-base font-semibold flex items-center gap-2"><Globe className="h-4 w-4 text-primary" aria-hidden="true" /> Language</h2>
        <SettingRow icon={Globe} title="Interface Language" description="Choose your preferred language">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Interface language"
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm focus-ring"
          >
            <option value="en">English</option>
            <option value="fr">Fran&ccedil;ais</option>
            <option value="es">Espa&ntilde;ol</option>
            <option value="ar">العربية</option>
          </select>
        </SettingRow>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-base font-semibold flex items-center gap-2">
          {resolvedTheme === "dark" ? <Moon className="h-4 w-4 text-primary" aria-hidden="true" /> : <Sun className="h-4 w-4 text-primary" aria-hidden="true" />} Theme
        </h2>
        <SettingRow icon={resolvedTheme === "dark" ? Moon : Sun} title="Color Theme" description="Switch between light and dark mode">
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
        <h2 className="mb-4 text-base font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" aria-hidden="true" /> Notifications</h2>
        <div className="space-y-2">
          <SettingRow icon={Bell} title="Appointment Reminders" description="Get notified about upcoming appointments">
            <Checkbox
              id="notify-appointments"
              checked={notifyApps}
              onCheckedChange={(checked) => setNotifyApps(checked === true)}
              aria-label="Appointment reminders"
            />
          </SettingRow>
          <SettingRow icon={Bell} title="Messages" description="Receive messages from your doctor">
            <Checkbox
              id="notify-messages"
              checked={notifyMessages}
              onCheckedChange={(checked) => setNotifyMessages(checked === true)}
              aria-label="Message notifications"
            />
          </SettingRow>
          <SettingRow icon={Bell} title="Health Reminders" description="Get medication and health tips reminders">
            <Checkbox
              id="notify-reminders"
              checked={notifyReminders}
              onCheckedChange={(checked) => setNotifyReminders(checked === true)}
              aria-label="Health reminders"
            />
          </SettingRow>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-base font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" aria-hidden="true" /> Privacy</h2>
        <p className="text-sm text-muted-foreground">
          Your medical data is encrypted and handled according to HIPAA and GDPR standards. We never share your information without explicit consent.
        </p>
        <div className="mt-4 rounded-xl bg-primary/5 p-3">
          <Label className="text-xs text-muted-foreground">
            You can request a full copy of your data or delete your account from the Privacy section in your account settings.
          </Label>
        </div>
      </div>
    </div>
  );
}
