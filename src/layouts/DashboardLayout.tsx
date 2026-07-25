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
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Phone,
  Settings,
  Shield,
  Stethoscope,
  Users,
  UserCircle,
  X,
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
import type { UserRole } from "@/types/auth";

type NavItem = {
  label: string;
  icon: React.ElementType;
  path: string;
};

const ROLE_NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    { label: "Users", icon: Users, path: "/admin/users" },
    { label: "Roles & Permissions", icon: Shield, path: "/admin/roles" },
    { label: "AI Configuration", icon: Cpu, path: "/admin/ai-config" },
    { label: "FAQ Library", icon: BookOpen, path: "/admin/faqs" },
    { label: "Statistics", icon: BarChart3, path: "/admin/statistics" },
    { label: "Activity Logs", icon: ClipboardList, path: "/admin/activity-logs" },
    { label: "Notifications", icon: Bell, path: "/admin/notifications" },
    { label: "Settings", icon: Settings, path: "/admin/settings" },
    { label: "Profile", icon: UserCircle, path: "/admin/profile" },
  ],
  doctor: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/doctor/dashboard" },
    { label: "Schedule", icon: CalendarClock, path: "/doctor/schedule" },
    { label: "Calendar", icon: Calendar, path: "/doctor/calendar" },
    { label: "Today's Patients", icon: Users, path: "/doctor/today" },
    { label: "Patients", icon: Stethoscope, path: "/doctor/patients" },
    { label: "AI Conversations", icon: Bot, path: "/doctor/ai-conversations" },
    { label: "Availability", icon: Clock, path: "/doctor/availability" },
    { label: "Notifications", icon: Bell, path: "/doctor/notifications" },
    { label: "Profile", icon: UserCircle, path: "/doctor/profile" },
    { label: "Settings", icon: Settings, path: "/doctor/settings" },
  ],
  secretary: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/secretary/dashboard" },
    { label: "Live Conversations", icon: MessageSquare, path: "/secretary/live-conversations" },
    { label: "Appointments", icon: CalendarClock, path: "/secretary/appointments" },
    { label: "Patient Queue", icon: Users, path: "/secretary/patient-queue" },
    { label: "Emergency Cases", icon: AlertTriangle, path: "/secretary/emergency-cases" },
    { label: "Calendar", icon: Calendar, path: "/secretary/calendar" },
    { label: "AI Monitoring", icon: Brain, path: "/secretary/ai-monitoring" },
    { label: "Call History", icon: Phone, path: "/secretary/call-history" },
    { label: "Notifications", icon: Bell, path: "/secretary/notifications" },
    { label: "Profile", icon: UserCircle, path: "/secretary/profile" },
    { label: "Settings", icon: Settings, path: "/secretary/settings" },
  ],
  patient: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/patient/dashboard" },
    { label: "Appointments", icon: CalendarClock, path: "/patient/appointments" },
    { label: "AI Assistant", icon: Bot, path: "/patient/ai-assistant" },
    { label: "Documents", icon: FileText, path: "/patient/documents" },
    { label: "Notifications", icon: Bell, path: "/patient/notifications" },
    { label: "Profile", icon: UserCircle, path: "/patient/profile" },
    { label: "Settings", icon: Settings, path: "/patient/settings" },
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

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1),
    path: "/" + segments.slice(0, i + 1).join("/"),
  }));
}

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const navItems = ROLE_NAV_ITEMS[user.role] ?? [];
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-white">
              <Activity className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-tight">Med Secretary</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="mr-3 grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <nav className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                <Link to={crumb.path} className="hover:text-foreground">
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* Notifications */}
            <button className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 grid h-2 w-2 place-items-center rounded-full bg-destructive" />
            </button>

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-accent">
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
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
