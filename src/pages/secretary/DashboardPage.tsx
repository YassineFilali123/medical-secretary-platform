import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  Users,
  CalendarClock,
  PhoneMissed,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { secretaryService } from "@/services/secretary";
import { useAuth } from "@/hooks/useAuth";
import type { Conversation, EmergencyCase } from "@/types/secretary";

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

export default function SecretaryDashboardPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyCase[]>([]);
  const [todayApps, setTodayApps] = useState(0);
  const [missedCalls, setMissedCalls] = useState(0);

  useEffect(() => {
    setConversations(secretaryService.getActiveConversations());
    setEmergencies(secretaryService.getEmergencyCases());
    setTodayApps(secretaryService.getAppointmentsByDate("2025-07-25").length);
    setMissedCalls(secretaryService.getMissedCallCount());
  }, []);

  const waitingPatients = secretaryService.getHighPriorityQueueCount();
  const avgConfidence = secretaryService.getAverageConfidence();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user?.name?.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s your front desk overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={MessageSquare} label="Active Conversations" value={conversations.length} color="bg-gradient-primary" />
        <StatCard icon={Users} label="Waiting Patients" value={waitingPatients} sub="High priority" color="bg-gradient-health" />
        <StatCard icon={CalendarClock} label="Today's Appointments" value={todayApps} color="bg-gradient-soft text-primary" />
        <StatCard icon={PhoneMissed} label="Missed Calls" value={missedCalls} color="bg-gradient-primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Emergency Alerts</h2>
              <Link to="/secretary/emergency-cases" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {emergencies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No emergency cases.</p>
            ) : (
              <div className="space-y-2">
                {emergencies.filter((e) => e.status !== "resolved").slice(0, 3).map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`h-5 w-5 ${e.severity === "critical" ? "text-destructive" : "text-amber-500"}`} />
                      <div>
                        <div className="text-sm font-medium">{e.patientName} <span className="text-xs text-muted-foreground">- {e.condition}</span></div>
                        <div className="text-xs text-muted-foreground">{e.arrivedAt} &middot; {e.severity} priority</div>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      e.severity === "critical" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"
                    }`}>{e.severity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-4 text-base font-semibold">AI Performance</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background p-4 text-center">
                <div className="text-2xl font-semibold text-primary">{avgConfidence}%</div>
                <div className="text-xs text-muted-foreground mt-1">Avg Confidence</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-center">
                <div className="text-2xl font-semibold text-amber-500">{secretaryService.getEscalatedCount()}</div>
                <div className="text-xs text-muted-foreground mt-1">Escalations Today</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-center">
                <div className="text-2xl font-semibold text-green-600">{secretaryService.getConversationMessageCount()}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Messages</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Active Conversations</h2>
            <div className="space-y-2">
              {conversations.slice(0, 3).map((c) => (
                <div key={c.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.patientName}</span>
                      {c.priority === "high" && <span className="h-2 w-2 rounded-full bg-destructive" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{c.lastMessageTime}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                </div>
              ))}
              <Link to="/secretary/live-conversations" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                View all conversations <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/secretary/live-conversations" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <MessageSquare className="h-5 w-5" /> Conversations
              </Link>
              <Link to="/secretary/appointments" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <CalendarClock className="h-5 w-5" /> Appointments
              </Link>
              <Link to="/secretary/patient-queue" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Users className="h-5 w-5" /> Queue
              </Link>
              <Link to="/secretary/emergency-cases" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <AlertTriangle className="h-5 w-5" /> Emergency
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
