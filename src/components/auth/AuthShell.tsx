import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Activity, ShieldCheck, HeartPulse, Stethoscope } from "lucide-react";

type AuthShellProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
};

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-health lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_50%),radial-gradient(circle_at_80%_60%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <Activity className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="text-base font-semibold tracking-tight">Medical Secretary Platform</span>
          </Link>
          <div className="relative">
            <div className="mx-auto grid h-72 w-72 place-items-center">
              <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl" />
              <div className="animate-float relative grid h-56 w-56 place-items-center rounded-full bg-white/15 backdrop-blur">
                <div className="animate-pulse-ring grid h-40 w-40 place-items-center rounded-full bg-white/25">
                  <HeartPulse className="h-20 w-20 text-white" strokeWidth={1.5} />
                </div>
              </div>
              <div className="absolute -left-4 top-6 rounded-2xl bg-white/95 p-3 text-foreground shadow-elevated">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-white">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold">Consultation booked</div>
                    <div className="text-muted-foreground">Dr. Chen · 09:00</div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-2 bottom-6 rounded-2xl bg-white/95 p-3 text-foreground shadow-elevated">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-health text-white">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold">HIPAA verified</div>
                    <div className="text-muted-foreground">All records encrypted</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-10 max-w-md">
              <h2 className="text-3xl font-semibold leading-tight">Care coordination, on autopilot.</h2>
              <p className="mt-3 text-white/80">
                Your AI medical secretary answers calls, books appointments, and keeps every record perfectly in sync.
              </p>
            </div>
          </div>
          <div className="text-xs text-white/70">
            &copy; {new Date().getFullYear()} Medical Secretary Platform
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-health text-white">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-semibold">Medical Secretary Platform</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
