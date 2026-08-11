import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Calendar,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Clock,
  Cpu,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MessageCircle,
  Phone,
  Radio,
  PhoneCall,
  AlertCircle,
  Settings,
  Shield,
  Stethoscope,
  TimerReset,
  Users,
  UserCircle,
  X,
  PieChart,
  Star,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { FloatingPatientChat } from "@/components/ai-assistant/FloatingPatientChat";
import type { UserRole } from "@/types/auth";

type NavItem = {
  label: string;
  icon: React.ElementType;
  path: string;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const ROLE_NAV_GROUPS: Record<UserRole, NavGroup[]> = {
  admin: [
    { items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    ]},
    { label: "Management", items: [
      { label: "Users", icon: Users, path: "/admin/users" },
      { label: "Roles & Permissions", icon: Shield, path: "/admin/roles" },
      { label: "AI Configuration", icon: Cpu, path: "/admin/ai-config" },
      { label: "FAQ Library", icon: BookOpen, path: "/admin/faqs" },
      { label: "Specialties", icon: Stethoscope, path: "/admin/specialties" },
    ]},
    { label: "Insights", items: [
      { label: "Statistics", icon: BarChart3, path: "/admin/statistics" },
      { label: "Analytics", icon: PieChart, path: "/analytics" },
      { label: "Activity Logs", icon: ClipboardList, path: "/admin/activity-logs" },
    ]},
    { label: "Communication", items: [
      { label: "AI Chat", icon: MessageSquare, path: "/ai-chat" },
      { label: "AI Assistant", icon: MessageCircle, path: "/ai-assistant" },
    ]},
    { items: [
      { label: "Notifications", icon: Bell, path: "/admin/notifications" },
      { label: "Settings", icon: Settings, path: "/admin/settings" },
      { label: "Profile", icon: UserCircle, path: "/admin/profile" },
    ]},
  ],
  doctor: [
    { items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/doctor/dashboard" },
    ]},
    { label: "Practice", items: [
      { label: "Schedule", icon: CalendarClock, path: "/doctor/schedule" },
      { label: "Calendar", icon: Calendar, path: "/doctor/calendar" },
      { label: "Appointments", icon: Users, path: "/doctor/today" },
      { label: "Live Consultation", icon: Radio, path: "/doctor/live-consultation" },
      { label: "Patients", icon: Stethoscope, path: "/doctor/patients" },
      { label: "Availability", icon: Clock, path: "/doctor/availability" },
    ]},
    { label: "AI & Insights", items: [
      { label: "AI Conversations", icon: Bot, path: "/doctor/ai-conversations" },
      { label: "Analytics", icon: PieChart, path: "/analytics" },
      { label: "AI Chat", icon: MessageSquare, path: "/ai-chat" },
      { label: "AI Assistant", icon: MessageCircle, path: "/ai-assistant" },
    ]},
    { items: [
      { label: "Notifications", icon: Bell, path: "/doctor/notifications" },
      { label: "Profile", icon: UserCircle, path: "/doctor/profile" },
      { label: "Settings", icon: Settings, path: "/doctor/settings" },
    ]},
  ],
  secretary: [
    { items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/secretary/dashboard" },
    ]},
    { label: "Live Operations", items: [
      { label: "Live Dashboard", icon: Radio, path: "/secretary/live-dashboard" },
      { label: "Active Conversations", icon: MessageSquare, path: "/secretary/active-conversations" },
      { label: "Live Chat", icon: MessageCircle, path: "/secretary/live-chat" },
      { label: "Call Queue", icon: PhoneCall, path: "/secretary/call-queue" },
      { label: "Emergency Queue", icon: AlertCircle, path: "/secretary/emergency-queue" },
    ]},
    { label: "Management", items: [
      { label: "Appointments", icon: CalendarClock, path: "/secretary/appointments" },
      { label: "Schedule Adjustments", icon: TimerReset, path: "/secretary/schedule-adjustments" },
      { label: "Follow-ups", icon: CalendarClock, path: "/secretary/followups" },
      { label: "Document Requests", icon: FolderOpen, path: "/secretary/document-requests" },
      { label: "Patient Queue", icon: Users, path: "/secretary/patient-queue" },
      { label: "Emergency Cases", icon: AlertTriangle, path: "/secretary/emergency-cases" },
      { label: "Calendar", icon: Calendar, path: "/secretary/calendar" },
    ]},
    { label: "AI & Insights", items: [
      { label: "AI Monitoring", icon: Brain, path: "/secretary/ai-monitoring" },
      { label: "Analytics", icon: PieChart, path: "/analytics" },
      { label: "AI Chat", icon: MessageSquare, path: "/ai-chat" },
      { label: "AI Assistant", icon: MessageCircle, path: "/ai-assistant" },
      { label: "Call History", icon: Phone, path: "/secretary/call-history" },
    ]},
    { items: [
      { label: "Notifications", icon: Bell, path: "/secretary/notifications" },
      { label: "Profile", icon: UserCircle, path: "/secretary/profile" },
      { label: "Settings", icon: Settings, path: "/secretary/settings" },
    ]},
  ],
  patient: [
    { items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/patient/dashboard" },
    ]},
    { label: "Health", items: [
      { label: "Appointments", icon: CalendarClock, path: "/patient/appointments" },
      { label: "Documents", icon: FileText, path: "/patient/documents" },
      { label: "Follow-ups", icon: Stethoscope, path: "/patient/followups" },
      { label: "Rate Consultations", icon: Star, path: "/patient/ratings" },
    ]},
    { items: [
      { label: "Notifications", icon: Bell, path: "/patient/notifications" },
      { label: "Profile", icon: UserCircle, path: "/patient/profile" },
      { label: "Settings", icon: Settings, path: "/patient/settings" },
    ]},
  ],
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const BREADCRUMB_LABELS: Record<string, string> = {
  admin: "Admin",
  doctor: "Doctor",
  secretary: "Secretary",
  patient: "Patient",
  dashboard: "Dashboard",
  users: "User Management",
  roles: "Roles & Permissions",
  "ai-config": "AI Configuration",
  faqs: "FAQ Library",
  statistics: "Statistics",
  analytics: "Analytics",
  "activity-logs": "Activity Logs",
  settings: "Settings",
  profile: "Profile",
  notifications: "Notifications",
  schedule: "Schedule",
  calendar: "Calendar",
  today: "Today's Patients",
  patients: "Patients",
  availability: "Availability",
  "ai-conversations": "AI Conversations",
  "ai-chat": "AI Chat",
  "ai-assistant": "AI Assistant",
  history: "History",
  chat: "Chat",
  "live-dashboard": "Live Dashboard",
  "active-conversations": "Active Conversations",
  "call-queue": "Call Queue",
  "emergency-queue": "Emergency Queue",
  appointments: "Appointments",
  "patient-queue": "Patient Queue",
  "emergency-cases": "Emergency Cases",
  "ai-monitoring": "AI Monitoring",
  "call-history": "Call History",
  documents: "Documents",
  conversations: "Conversations",
  "followups": "Follow-ups",
  "book": "Book Appointment",
  "live-chat": "Live Chat",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: BREADCRUMB_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    path: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));
}

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const navGroups = ROLE_NAV_GROUPS[user.role] ?? [];
  const breadcrumbs = getBreadcrumbs(location.pathname);

  function isItemActive(path: string): boolean {
    if (path === "/ai-assistant") return location.pathname.startsWith("/ai-assistant");
    if (path === "/secretary/active-conversations")
      return location.pathname.startsWith("/secretary/active-conversations") || location.pathname.startsWith("/secretary/conversations");
    if (path === "/analytics") return location.pathname === "/analytics" || location.pathname.startsWith("/analytics/");
    if (path.startsWith("/secretary/") && path !== "/secretary/dashboard")
      return location.pathname === path || location.pathname.startsWith(path + "/");
    return location.pathname === path;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Sidebar navigation"
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link to="/" className="flex items-center gap-2.5 focus-ring rounded-lg" aria-label="Med Secretary Home">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-white">
              <Activity className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Med Secretary</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent focus-ring lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3" aria-label="Main navigation">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = isItemActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-ring"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="mr-3 grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent focus-ring lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <nav className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" aria-hidden="true" />}
                {crumb.isLast ? (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                ) : (
                  <Link to={crumb.path} className="rounded-md px-1 py-0.5 transition-colors hover:text-foreground focus-ring">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-accent focus-ring" aria-label="User menu">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left text-sm md:block">
                    <div className="font-medium text-foreground">{user.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/${user.role}/settings`)}>
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>

      {user.role === "patient" && <FloatingPatientChat />}
    </div>
  );
}
