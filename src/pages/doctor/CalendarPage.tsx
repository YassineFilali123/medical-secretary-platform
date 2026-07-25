import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, format, isSameMonth, isSameDay } from "date-fns";
import { doctorService } from "@/services/doctor";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  "in-progress": "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const appointments = doctorService.getAllAppointments();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days = useMemo(() => {
    const d: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      d.push(day);
      day = addDays(day, 1);
    }
    return d;
  }, [calStart, calEnd]);

  const selectedApps = appointments.filter((a) => a.date === format(selectedDate, "yyyy-MM-dd"));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[160px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="grid grid-cols-7 gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const hasAppointment = appointments.some((a) => a.date === dateStr);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`relative rounded-lg py-2 text-center text-sm transition-colors ${
                    isSelected ? "bg-primary text-primary-foreground" : isCurrentMonth ? "hover:bg-accent" : "text-muted-foreground/40"
                  }`}
                >
                  {format(day, "d")}
                  {hasAppointment && !isSelected && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-base font-semibold">{format(selectedDate, "EEEE, MMMM d")}</h2>
          {selectedApps.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No appointments on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedApps.map((a) => (
                <div key={a.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{a.patientName}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[a.status] ?? ""}`}>{a.status}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {a.time} &middot; {a.duration}min
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.reason}</p>
                  <Link to={`/doctor/patients/${a.patientId}`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">View patient</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
