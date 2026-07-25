import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import { TrendingUp, CalendarDays, Users, CheckCircle } from "lucide-react";

const dailyAppointments = [
  { day: "Mon", appointments: 18, completed: 15, cancelled: 2 },
  { day: "Tue", appointments: 22, completed: 20, cancelled: 1 },
  { day: "Wed", appointments: 15, completed: 12, cancelled: 3 },
  { day: "Thu", appointments: 25, completed: 22, cancelled: 1 },
  { day: "Fri", appointments: 20, completed: 18, cancelled: 1 },
  { day: "Sat", appointments: 8, completed: 7, cancelled: 1 },
];

const monthlyData = [
  { month: "Jan", appointments: 320, calls: 180, aiConversations: 450 },
  { month: "Feb", appointments: 280, calls: 165, aiConversations: 420 },
  { month: "Mar", appointments: 350, calls: 200, aiConversations: 510 },
  { month: "Apr", appointments: 300, calls: 175, aiConversations: 480 },
  { month: "May", appointments: 380, calls: 220, aiConversations: 540 },
  { month: "Jun", appointments: 360, calls: 195, aiConversations: 520 },
];

const userGrowthData = [
  { month: "Jan", patients: 120, doctors: 3, secretaries: 1 },
  { month: "Feb", patients: 145, doctors: 3, secretaries: 2 },
  { month: "Mar", patients: 170, doctors: 4, secretaries: 2 },
  { month: "Apr", patients: 200, doctors: 4, secretaries: 2 },
  { month: "May", patients: 230, doctors: 5, secretaries: 2 },
  { month: "Jun", patients: 260, doctors: 5, secretaries: 3 },
];

const satisfactionData = [
  { month: "Jan", rating: 4.2 },
  { month: "Feb", rating: 4.3 },
  { month: "Mar", rating: 4.1 },
  { month: "Apr", rating: 4.4 },
  { month: "May", rating: 4.5 },
  { month: "Jun", rating: 4.3 },
];

const cancellationRate = [
  { month: "Jan", rate: 8.2 },
  { month: "Feb", rate: 7.5 },
  { month: "Mar", rate: 9.1 },
  { month: "Apr", rate: 6.8 },
  { month: "May", rate: 7.2 },
  { month: "Jun", rate: 6.5 },
];

const callData = [
  { month: "Jan", answered: 150, missed: 30 },
  { month: "Feb", answered: 140, missed: 25 },
  { month: "Mar", answered: 170, missed: 30 },
  { month: "Apr", answered: 155, missed: 20 },
  { month: "May", answered: 185, missed: 35 },
  { month: "Jun", answered: 170, missed: 25 },
];

export default function StatisticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Statistics</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" /> Daily Avg</div>
          <div className="mt-1 text-2xl font-semibold">18</div>
          <div className="text-xs text-green-600">&uarr; 5% from last week</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4" /> Completion Rate</div>
          <div className="mt-1 text-2xl font-semibold">87%</div>
          <div className="text-xs text-green-600">&uarr; 2% improvement</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Total Patients</div>
          <div className="mt-1 text-2xl font-semibold">260</div>
          <div className="text-xs text-green-600">&uarr; 30 this quarter</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle className="h-4 w-4" /> Satisfaction</div>
          <div className="mt-1 text-2xl font-semibold">4.3/5</div>
          <div className="text-xs text-green-600">Above target</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-4 text-sm font-semibold">Daily Appointments</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyAppointments}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="appointments" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total" />
              <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-4 text-sm font-semibold">Monthly Appointments &amp; AI Conversations</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="appointments" stroke="#6366f1" strokeWidth={2} name="Appointments" />
              <Line type="monotone" dataKey="aiConversations" stroke="#22c55e" strokeWidth={2} name="AI Conversations" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-4 text-sm font-semibold">Calls Overview</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={callData} stackOffset="sign">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="answered" stackId="a" fill="#22c55e" name="Answered" />
              <Bar dataKey="missed" stackId="a" fill="#ef4444" name="Missed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-4 text-sm font-semibold">User Growth</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="patients" stackId="1" stroke="#6366f1" fill="#6366f1" name="Patients" />
              <Area type="monotone" dataKey="doctors" stackId="1" stroke="#22c55e" fill="#22c55e" name="Doctors" />
              <Area type="monotone" dataKey="secretaries" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Secretaries" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-4 text-sm font-semibold">Satisfaction Rating</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={satisfactionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[3, 5]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="rating" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} name="Rating" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-4 text-sm font-semibold">Cancellation Rate (%)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={cancellationRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="rate" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Cancellation Rate" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
