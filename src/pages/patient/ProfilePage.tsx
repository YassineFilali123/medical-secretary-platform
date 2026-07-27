import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { ChangePasswordCard } from "@/components/profile/ChangePasswordCard";
import { AvatarPicker } from "@/components/profile/AvatarPicker";

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function PatientProfilePage() {
  const { user } = useAuth();
  const { profile, status, error, save, isLoading } = useProfile();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    bloodType: "",
    allergies: "",
    emergencyContact: "",
  });

  // Populate the form once the profile arrives from the API.
  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? "",
      phone: profile.phone ?? "",
      dateOfBirth: profile.dateOfBirth ?? "",
      gender: profile.gender ?? "",
      bloodType: profile.bloodType ?? "",
      allergies: profile.allergies ?? "",
      emergencyContact: profile.emergencyContact ?? "",
    });
  }, [profile]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const displayName = profile?.name || user?.name || "";

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>

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
            <p className="text-sm text-muted-foreground">{profile?.email ?? user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">
              Role: {profile?.role ?? user?.role}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="mb-4 text-base font-semibold">Personal Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              disabled={isLoading}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile?.email ?? user?.email ?? ""}
              readOnly
              disabled
              className="h-10 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Contact an administrator to change your email.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              disabled={isLoading}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
              disabled={isLoading}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              value={form.gender}
              onChange={(e) => handleChange("gender", e.target.value)}
              disabled={isLoading}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">Not specified</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blood">Blood Type</Label>
            <select
              id="blood"
              value={form.bloodType}
              onChange={(e) => handleChange("bloodType", e.target.value)}
              disabled={isLoading}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">Not specified</option>
              {BLOOD_TYPES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="allergies">Allergies</Label>
            <Input
              id="allergies"
              value={form.allergies}
              onChange={(e) => handleChange("allergies", e.target.value)}
              disabled={isLoading}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="emergency">Emergency Contact</Label>
            <Input
              id="emergency"
              value={form.emergencyContact}
              onChange={(e) => handleChange("emergencyContact", e.target.value)}
              disabled={isLoading}
              className="h-10 rounded-xl"
            />
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
