import { useState } from "react";
import { Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function PatientProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "+1 (555) 123-4567",
    dateOfBirth: "1990-03-15",
    gender: "Male",
    bloodType: "A+",
    allergies: "Penicillin, Sulfa",
    emergencyContact: "Jane Doe - +1 (555) 987-6543",
  });
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-primary text-2xl font-semibold text-white">
              {user?.name?.split(" ").map((n) => n[0]).join("") ?? "U"}
            </div>
            <button className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border border-border bg-background shadow-soft" aria-label="Change photo">
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-semibold">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">Role: {user?.role}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="mb-4 text-base font-semibold">Personal Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => handleChange("email", e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input type="date" value={form.dateOfBirth} onChange={(e) => handleChange("dateOfBirth", e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <select value={form.gender} onChange={(e) => handleChange("gender", e.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Blood Type</Label>
            <select value={form.bloodType} onChange={(e) => handleChange("bloodType", e.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option>A+</option>
              <option>A-</option>
              <option>B+</option>
              <option>B-</option>
              <option>AB+</option>
              <option>AB-</option>
              <option>O+</option>
              <option>O-</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Allergies</Label>
            <Input value={form.allergies} onChange={(e) => handleChange("allergies", e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Emergency Contact</Label>
            <Input value={form.emergencyContact} onChange={(e) => handleChange("emergencyContact", e.target.value)} className="h-10 rounded-xl" />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleSave} className="rounded-xl bg-gradient-primary">{saved ? "Saved!" : "Save Changes"}</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="mb-4 text-base font-semibold">Change Password</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Current Password</Label>
            <Input type="password" value={pwForm.current} onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <Input type="password" value={pwForm.newPw} onChange={(e) => setPwForm((p) => ({ ...p, newPw: e.target.value }))} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm</Label>
            <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} className="h-10 rounded-xl" />
          </div>
        </div>
        <div className="mt-4">
          <Button variant="outline" className="rounded-xl">Update Password</Button>
        </div>
      </div>
    </div>
  );
}
