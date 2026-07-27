import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bot,
  CalendarClock,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-white shadow-soft">
              <Activity className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="text-base font-semibold tracking-tight">Medical Secretary Platform</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#roles" className="hover:text-foreground">
              For your team
            </a>
            <a href="#security" className="hover:text-foreground">
              Security
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="rounded-full">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild className="rounded-full bg-gradient-primary shadow-soft">
              <Link to="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 py-24 md:px-6 md:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,var(--primary-soft),transparent_50%),radial-gradient(circle_at_80%_20%,var(--secondary-soft),transparent_50%)]" />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> HIPAA-compliant &middot; SOC 2 Type II
          </div>
          <h1 className="text-5xl font-semibold tracking-tight text-foreground md:text-7xl">
            The AI secretary <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              every clinic deserves.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Books appointments, triages emergency calls and manages your patient queue — 24/7, in every
            language, without breaking a sweat.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-gradient-primary px-6 shadow-elevated"
            >
              <Link to="/register">
                Start free trial <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6">
              <Link to="/login">See it in action</Link>
            </Button>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl px-4 py-16 md:px-6"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Bot,
              title: "AI voice agent",
              desc: "Human-like phone conversations that book, reschedule and triage in real time.",
            },
            {
              icon: CalendarClock,
              title: "Smart scheduling",
              desc: "Auto-fills gaps, respects doctor preferences and cuts no-shows by 42%.",
            },
            {
              icon: HeartPulse,
              title: "Emergency triage",
              desc: "Detects urgency cues and escalates critical calls to a live clinician in seconds.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:shadow-elevated"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-soft text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="roles" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Built for every role in your clinic
          </h2>
          <p className="mt-2 text-muted-foreground">One platform, tailored dashboards.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: ShieldCheck,
              title: "Admin",
              desc: "Users, roles, AI config & analytics.",
            },
            {
              icon: Stethoscope,
              title: "Doctor",
              desc: "Schedule, patients & consult notes.",
            },
            {
              icon: HeartPulse,
              title: "Patient",
              desc: "Book, chat with AI, view records.",
            },
            {
              icon: Bot,
              title: "Secretary",
              desc: "Live calls, queue & emergency triage.",
            },
          ].map((r) => (
            <div
              key={r.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-white">
                <r.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{r.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary">
                Open dashboard <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="security" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="overflow-hidden rounded-3xl bg-gradient-health p-10 text-white shadow-elevated md:p-16">
          <div className="max-w-2xl">
            <ShieldCheck className="h-10 w-10" />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Compliance is not an afterthought.
            </h2>
            <p className="mt-3 text-white/80">
              End-to-end encryption, audit logs on every action, and BAAs signed by default. HIPAA, GDPR
              and SOC 2 Type II — from day one.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground md:flex-row md:px-6">
          <p>&copy; 2026 Medical Secretary Platform. HIPAA-compliant medical AI platform.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground">
              Terms
            </a>
            <a href="#" className="hover:text-foreground">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
