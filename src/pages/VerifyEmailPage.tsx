import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth";
import { ROUTES } from "@/constants/routes";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const stored = authService.getPendingVerificationEmail();
    if (stored) {
      setEmail(stored);
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code) {
      setError("Please enter your email and verification code.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await authService.verifyCode(email, code);
      setSuccess(true);
      setMessage("Email verified successfully! Redirecting to login...");
      setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setError("");
    setIsResending(true);
    try {
      const result = await authService.resendCode(email);
      setMessage("A new verification code has been sent to your email.");
      if (result.debug_code) {
        setDebugCode(result.debug_code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Enter the 6-digit code sent to your email address."
    >
      {success ? (
        <div className="space-y-4 text-center">
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleVerify}>
          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
              {message}
            </div>
          )}
          {debugCode && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <strong>Dev mode:</strong> Your verification code is <strong>{debugCode}</strong>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="h-11 rounded-xl"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              className="h-11 rounded-xl text-center text-lg tracking-[0.5em] font-mono"
              maxLength={6}
              pattern="[0-9]{6}"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="h-11 w-full rounded-xl bg-gradient-primary text-base shadow-soft"
          >
            {isLoading ? "Verifying..." : "Verify"}
          </Button>
          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isResending}
              onClick={handleResend}
              className="text-sm"
            >
              {isResending ? "Sending..." : "Resend verification code"}
            </Button>
            <Link
              to={ROUTES.LOGIN}
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              Back to login
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
