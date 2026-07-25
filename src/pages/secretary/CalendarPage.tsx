import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { secretaryService } from "@/services/secretary";
import { addDays, startOfWeek, format, isSameDay } from "date-fns";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-gray-100 text-gray-600",
};

export default function SecretaryCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const appointments = secretaryService.getAppointments();

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return appointments.filter((a) => a.date === dateStr);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate((d) => addDays(d, -7))} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[160px] text-center">
            {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <button onClick={() => setCurrentDate((d) => addDays(d, 7))} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        {weekDays.map((day) => {
          const dayApps = getAppointmentsForDay(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className={`rounded-xl border border-border p-3 ${isToday ? "ring-2 ring-primary/20" : ""}`}>
              <div className={`mb-2 text-center text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                <div>{format(day, "EEE")}</div>
                <div className={`mt-0.5 text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</div>
              </div>
              <div className="space-y-1.5">
                {dayApps.map((a) => (
                  <div key={a.id} className="block rounded-lg border border-border/50 bg-background p-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{a.time}</span>
                    </div>
                    <div className="font-medium truncate mt-0.5">{a.patientName}</div>
                    <div className="text-muted-foreground truncate">{a.doctorName}</div>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[a.status]}`}>{a.status}</span>
                  </div>
                ))}
                {dayApps.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No appointments</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
