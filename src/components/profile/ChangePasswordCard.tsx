import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { profileService } from "@/services/profile";

const MIN_LENGTH = 8;

type Props = {
  /** Email of the signed-in user — the backend uses it with the current password to prove identity. */
  email: string;
};

/**
 * Shared by all four role Profile pages. The previous "Update Password"
 * buttons had no onClick at all.
 */
export function ChangePasswordCard({ email }: Props) {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && newPw !== confirm;
  const tooShort = newPw.length > 0 && newPw.length < MIN_LENGTH;
  const canSubmit =
    !busy && current.length > 0 && newPw.length >= MIN_LENGTH && newPw === confirm;

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("Could not determine your account email. Try signing in again.");
      return;
    }

    setBusy(true);
    try {
      const message = await profileService.changePassword({
        email,
        currentPassword: current,
        newPassword: newPw,
        confirmPassword: confirm,
      });
      setSuccess(message);
      setCurrent("");
      setNewPw("");
      setConfirm("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="mb-4 text-base font-semibold">Change Password</h2>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-2 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="pw-current">Current Password</Label>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-new">New Password</Label>
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="h-10 rounded-xl"
            aria-invalid={tooShort}
          />
          {tooShort && (
            <p className="text-xs text-destructive">At least {MIN_LENGTH} characters.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-confirm">Confirm Password</Label>
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-10 rounded-xl"
            aria-invalid={mismatch}
          />
          {mismatch && <p className="text-xs text-destructive">Passwords do not match.</p>}
        </div>
      </div>

      <div className="mt-4">
        <Button
          variant="outline"
          className="rounded-xl"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {busy ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </div>
  );
}
