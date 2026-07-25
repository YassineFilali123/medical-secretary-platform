import { useState } from "react";
import { Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function SecretaryProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "Marie Dupont",
    email: user?.email ?? "marie@example.com",
    phone: "+212 6 12 34 56 78",
    department: "Front Desk",
  });
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-primary text-2xl font-semibold text-white">
              {form.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <button className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border border-border bg-background shadow-soft">
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-semibold">{form.name}</h2>
            <p className="text-sm text-muted-foreground">Secretary</p>
            <p className="text-xs text-muted-foreground">{form.department}</p>
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
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => handleChange("department", e.target.value)} className="h-10 rounded-xl" />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleSaveProfile} className="rounded-xl bg-gradient-primary">
            {saved ? "Saved!" : "Save Changes"}
          </Button>
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
            <Label>Confirm Password</Label>
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
