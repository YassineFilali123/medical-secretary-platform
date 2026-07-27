import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { ChangePasswordCard } from "@/components/profile/ChangePasswordCard";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { specialtyService, type Specialty } from "@/services/specialty";

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const { profile, status, error, save, isLoading } = useProfile();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    specialtyId: "" as string,
    licenseNumber: "",
    bio: "",
    clinicName: "",
    clinicAddress: "",
  });

  // The Admin curates this list; re-fetched on every mount so additions,
  // renames and deactivations show up as soon as the doctor opens the page.
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtyError, setSpecialtyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    specialtyService
      .list()
      .then((list) => {
        if (!cancelled) setSpecialties(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSpecialtyError(
            err instanceof Error ? err.message : "Could not load the specialty list.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? "",
      phone: profile.phone ?? "",
      specialtyId: profile.specialtyId != null ? String(profile.specialtyId) : "",
      licenseNumber: profile.licenseNumber ?? "",
      bio: profile.bio ?? "",
      clinicName: profile.clinicName ?? "",
      clinicAddress: profile.clinicAddress ?? "",
    });
  }, [profile]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const displayName = profile?.name || user?.name || "";

  // A doctor whose specialty was deactivated must still see it selected, or the
  // <select> would silently blank out a value they never changed.
  const currentIsMissing =
    profile?.specialtyId != null && !specialties.some((s) => s.id === profile.specialtyId);

  const specialtyOptions = currentIsMissing
    ? [
        ...specialties,
        {
          id: profile.specialtyId as number,
          name: `${profile.specialty ?? "Current specialty"} (no longer offered)`,
          description: null,
          isActive: false,
          sortOrder: 0,
          doctorCount: null,
          createdAt: null,
          updatedAt: null,
        } satisfies Specialty,
      ]
    : specialties;

  const selectedSpecialtyName =
    specialtyOptions.find((s) => String(s.id) === form.specialtyId)?.name ?? "";

  function handleSave() {
    void save({
      ...form,
      specialtyId: form.specialtyId === "" ? null : Number(form.specialtyId),
    });
  }

  const saveButton = (
    <Button
      onClick={handleSave}
      disabled={isLoading || status === "saving"}
      className="rounded-xl bg-gradient-primary"
    >
      {status === "saving" ? "Saving..." : status === "saved" ? "Saved!" : "Save Changes"}
    </Button>
  );

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
            <p className="text-sm text-muted-foreground">{selectedSpecialtyName || "—"}</p>
            <p className="text-xs text-muted-foreground">{form.clinicName || "—"}</p>
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
            <p className="text-xs text-muted-foreground">Contact an administrator to change your email.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} disabled={isLoading} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="specialty">Specialty</Label>
            <select
              id="specialty"
              value={form.specialtyId}
              onChange={(e) => handleChange("specialtyId", e.target.value)}
              disabled={isLoading || specialties.length === 0}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">Not specified</option>
              {specialtyOptions.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
            {specialtyError ? (
              <p className="text-xs text-destructive">{specialtyError}</p>
            ) : specialties.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No specialties available yet — ask an administrator to add some.
              </p>
            ) : currentIsMissing ? (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Your current specialty is no longer offered. Please choose another.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Managed by your administrator.</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="license">License Number</Label>
            <Input id="license" value={form.licenseNumber} onChange={(e) => handleChange("licenseNumber", e.target.value)} disabled={isLoading} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={form.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              disabled={isLoading}
              className="h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>
        <div className="mt-4">{saveButton}</div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="mb-4 text-base font-semibold">Clinic Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="clinic-name">Clinic Name</Label>
            <Input id="clinic-name" value={form.clinicName} onChange={(e) => handleChange("clinicName", e.target.value)} disabled={isLoading} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="clinic-address">Clinic Address</Label>
            <Input id="clinic-address" value={form.clinicAddress} onChange={(e) => handleChange("clinicAddress", e.target.value)} disabled={isLoading} className="h-10 rounded-xl" />
          </div>
        </div>
        <div className="mt-4">{saveButton}</div>
      </div>

      <ChangePasswordCard email={profile?.email ?? user?.email ?? ""} />
    </div>
  );
}
