import { useState } from "react";
import { Bell, Globe, Moon, Sun, Shield } from "lucide-react";

function SettingRow({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function PatientSettingsPage() {
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("en");
  const [notifyApps, setNotifyApps] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-base font-semibold flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Language</h2>
        <SettingRow icon={Globe} title="Interface Language" description="Choose your preferred language">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
            <option value="en">English</option>
            <option value="fr">Fran&ccedil;ais</option>
            <option value="es">Espa&ntilde;ol</option>
            <option value="ar">العربية</option>
          </select>
        </SettingRow>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-base font-semibold flex items-center gap-2">
          {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />} Theme
        </h2>
        <SettingRow icon={theme === "dark" ? Moon : Sun} title="Color Theme" description="Switch between light and dark mode">
          <select value={theme} onChange={(e) => setTheme(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </SettingRow>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-base font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notifications</h2>
        <div className="space-y-2">
          <SettingRow icon={Bell} title="Appointment Reminders" description="Get notified about upcoming appointments">
            <input type="checkbox" checked={notifyApps} onChange={(e) => setNotifyApps(e.target.checked)} className="h-4 w-4 rounded border-primary text-primary" />
          </SettingRow>
          <SettingRow icon={Bell} title="Messages" description="Receive messages from your doctor">
            <input type="checkbox" checked={notifyMessages} onChange={(e) => setNotifyMessages(e.target.checked)} className="h-4 w-4 rounded border-primary text-primary" />
          </SettingRow>
          <SettingRow icon={Bell} title="Health Reminders" description="Get medication and health tips reminders">
            <input type="checkbox" checked={notifyReminders} onChange={(e) => setNotifyReminders(e.target.checked)} className="h-4 w-4 rounded border-primary text-primary" />
          </SettingRow>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-base font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Privacy</h2>
        <p className="text-sm text-muted-foreground">
          Your medical data is encrypted and handled according to HIPAA and GDPR standards. We never share your information without explicit consent.
        </p>
        <div className="mt-4 rounded-xl bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">
            You can request a full copy of your data or delete your account from the Privacy section in your account settings.
          </p>
        </div>
      </div>
    </div>
  );
}
