import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users, Stethoscope, UserCircle, MessageSquare,
  CalendarClock, Activity, ShieldCheck, Brain,
  ArrowRight, UserPlus, Settings,
} from "lucide-react";
import { adminService } from "@/services/admin";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/shared/StatCard";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    patients: 0,
    doctors: 0,
    secretaries: 0,
  });

  useEffect(() => {
    setStats({
      totalUsers: adminService.getUserCount(),
      patients: adminService.getUserCountByRole("patient"),
      doctors: adminService.getUserCountByRole("doctor"),
      secretaries: adminService.getUserCountByRole("secretary"),
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back, {user?.name?.split(" ")[0]}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub={`${adminService.getActiveUserCount()} active`} color="bg-gradient-primary" />
        <StatCard icon={UserCircle} label="Patients" value={stats.patients} color="bg-gradient-health" />
        <StatCard icon={Stethoscope} label="Doctors" value={stats.doctors} color="bg-gradient-soft text-primary" />
        <StatCard icon={UserCircle} label="Secretaries" value={stats.secretaries} color="bg-gradient-primary" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">AI Conversations</span>
          </div>
          <div className="text-2xl font-semibold">1,247</div>
          <div className="text-xs text-green-600 mt-1">&uarr; 12% from last month</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3 mb-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Today's Appointments</span>
          </div>
          <div className="text-2xl font-semibold">24</div>
          <div className="text-xs text-muted-foreground mt-1">18 confirmed, 6 pending</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-5 w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">System Status</span>
          </div>
          <div className="text-2xl font-semibold text-green-600">Healthy</div>
          <div className="text-xs text-muted-foreground mt-1">All systems operational</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">AI Accuracy</span>
          </div>
          <div className="text-2xl font-semibold">94.2%</div>
          <div className="text-xs text-green-600 mt-1">&uarr; 2.1% this week</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-4 text-base font-semibold">Recent Activity</h2>
          <div className="space-y-3">
            {adminService.getActivityLogs().slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary shrink-0">
                  {log.user.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm"><span className="font-medium">{log.user}</span> {log.action} {log.resource}</div>
                  <div className="text-xs text-muted-foreground truncate">{log.details}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{log.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/admin/activity-logs" className="mt-4 inline-flex text-xs font-medium text-primary hover:underline items-center gap-1">
            View all activity <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/admin/users" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <UserPlus className="h-5 w-5" /> Add User
              </Link>
              <Link to="/admin/roles" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <ShieldCheck className="h-5 w-5" /> Roles
              </Link>
              <Link to="/admin/ai-config" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Brain className="h-5 w-5" /> AI Config
              </Link>
              <Link to="/admin/settings" className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Settings className="h-5 w-5" /> Settings
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold">System Overview</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Sessions</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">API Usage Today</span>
                <span className="font-medium">3,421</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Storage Used</span>
                <span className="font-medium">156 GB / 200 GB</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-gradient-primary" style={{ width: "78%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
