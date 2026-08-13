import { UserSettings } from "@/components/shared/UserSettings";

/**
 * Only the theme is shown, because it is the only preference the platform
 * persists. See UserSettings for why the other controls were removed.
 */
export default function PatientSettingsPage() {
  return <UserSettings />;
}
