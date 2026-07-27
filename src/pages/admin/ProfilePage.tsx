import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { ChangePasswordCard } from "@/components/profile/ChangePasswordCard";
import { AvatarPicker } from "@/components/profile/AvatarPicker";

export default function AdminProfilePage() {
  const { user } = useAuth();
  const { profile, status, error, save, isLoading } = useProfile();

  const [form, setForm] = useState({ name: "", phone: "" });

  useEffect(() => {
    if (!profile) return;
    setForm({ name: profile.name ?? "", phone: profile.phone ?? "" });
  }, [profile]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const displayName = profile?.name || user?.name || "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <AvatarPicker
            name={displayName}
            avatarUrl={profile?.avatarUrl ?? null}
            onSave={(url) => save({ avatarUrl: url })}
            disabled={isLoading}
          />
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-semibold">{displayName}</h2>
            <p className="text-sm text-muted-foreground">Administrator</p>
            <p className="text-xs text-muted-foreground">{profile?.email ?? user?.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="mb-4 text-base font-semibold">Personal Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} disabled={isLoading} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email ?? user?.email ?? ""} readOnly disabled className="h-10 rounded-xl" />
            <p className="text-xs text-muted-foreground">Email changes require the verification flow.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} disabled={isLoading} className="h-10 rounded-xl" />
          </div>
        </div>
        <div className="mt-4">
          <Button
            onClick={() => save(form)}
            disabled={isLoading || status === "saving"}
            className="rounded-xl bg-gradient-primary"
          >
            {status === "saving" ? "Saving..." : status === "saved" ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      <ChangePasswordCard email={profile?.email ?? user?.email ?? ""} />
    </div>
  );
}
