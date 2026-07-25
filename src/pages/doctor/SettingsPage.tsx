import { useState } from "react";
import { Bell, Globe, Moon, Sun, Shield } from "lucide-react";

type SettingRowProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
};

function SettingRow({ icon: Icon, title, description, children }: SettingRowProps) {
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

export default function DoctorSettingsPage() {
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("en");
  const [notifyApps, setNotifyApps] = useState(true);
  const [notifyEmergency, setNotifyEmergency] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-base font-semibold flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Language</h2>
        <SettingRow icon={Globe} title="Interface Language" description="Choose your preferred language">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
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
          {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />} Theme
        </h2>
        <SettingRow icon={theme === "dark" ? Moon : Sun} title="Color Theme" description="Switch between light and dark mode">
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </SettingRow>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-base font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notification Preferences</h2>
        <div className="space-y-2">
          <SettingRow icon={Bell} title="Appointment Reminders" description="Get notified about upcoming appointments">
            <input type="checkbox" checked={notifyApps} onChange={(e) => setNotifyApps(e.target.checked)} className="h-4 w-4 rounded border-primary text-primary" />
          </SettingRow>
          <SettingRow icon={Bell} title="Emergency Alerts" description="Receive emergency notifications immediately">
            <input type="checkbox" checked={notifyEmergency} onChange={(e) => setNotifyEmergency(e.target.checked)} className="h-4 w-4 rounded border-primary text-primary" />
          </SettingRow>
          <SettingRow icon={Bell} title="System Reminders" description="Get system updates and reminders">
            <input type="checkbox" checked={notifyReminders} onChange={(e) => setNotifyReminders(e.target.checked)} className="h-4 w-4 rounded border-primary text-primary" />
          </SettingRow>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-base font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Privacy</h2>
        <p className="text-sm text-muted-foreground">
          Your data is encrypted end-to-end and handled according to HIPAA and GDPR compliance standards.
          No patient information is shared without explicit consent.
        </p>
        <div className="mt-4 rounded-xl bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">
            All accesses are logged and auditable. You can download your data at any time from the Privacy section.
          </p>
        </div>
      </div>
    </div>
  );
}
