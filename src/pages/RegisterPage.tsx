import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError("Please select a role");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await register({
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
        role: role as UserRole,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Start automating your medical practice in minutes."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="fn">First name</Label>
            <Input
              id="fn"
              className="h-11 rounded-xl"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ln">Last name</Label>
            <Input
              id="ln"
              className="h-11 rounded-xl"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            className="h-11 rounded-xl"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">I am a...</Label>
          <Select onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger id="role" className="h-11 rounded-xl">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {/* "Clinic Admin" is deliberately not offered. Registration is
                  public, so a self-service admin option would let anyone grant
                  themselves the admin module. The backend rejects role=admin
                  here too; admins are created by an existing admin. */}
              <SelectItem value="doctor">Doctor</SelectItem>
              <SelectItem value="secretary">Secretary</SelectItem>
              <SelectItem value="patient">Patient</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Password</Label>
          <Input
            id="pw"
            type="password"
            className="h-11 rounded-xl"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full rounded-xl bg-gradient-primary text-base shadow-soft"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have one?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
