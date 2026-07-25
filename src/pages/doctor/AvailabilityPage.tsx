import { useState } from "react";
import { Clock, Plus, Trash2, Calendar } from "lucide-react";
import { doctorService } from "@/services/doctor";
import type { AvailabilitySlot, VacationDay } from "@/types/doctor";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(() => doctorService.getAvailability());
  const [vacations, setVacations] = useState<VacationDay[]>(() => doctorService.getVacations());
  const [newVacationDate, setNewVacationDate] = useState("");
  const [newVacationReason, setNewVacationReason] = useState("");
  const [saved, setSaved] = useState(false);

  const toggleDay = (dayIndex: number) => {
    setSlots((prev) => prev.map((s) => (s.dayOfWeek === dayIndex ? { ...s, enabled: !s.enabled } : s)));
    setSaved(false);
  };

  const updateSlot = (dayIndex: number, field: keyof AvailabilitySlot, value: string | number) => {
    setSlots((prev) => prev.map((s) => (s.dayOfWeek === dayIndex ? { ...s, [field]: value } : s)));
    setSaved(false);
  };

  const handleSave = () => {
    doctorService.updateAvailability(slots);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddVacation = () => {
    if (!newVacationDate) return;
    const v: VacationDay = { id: `v${Date.now()}`, date: newVacationDate, reason: newVacationReason || "Day off" };
    doctorService.addVacation(v);
    setVacations(doctorService.getVacations());
    setNewVacationDate("");
    setNewVacationReason("");
  };

  const handleRemoveVacation = (id: string) => {
    doctorService.removeVacation(id);
    setVacations(doctorService.getVacations());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <button
          onClick={handleSave}
          className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-white shadow-soft transition-opacity hover:opacity-90"
        >
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-4 text-base font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Working Days & Hours</h2>
          <div className="space-y-2">
            {slots.map((slot) => (
              <div key={slot.dayOfWeek} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 min-w-[100px]">
                  <input
                    type="checkbox"
                    checked={slot.enabled}
                    onChange={() => toggleDay(slot.dayOfWeek)}
                    className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">{DAY_LABELS[slot.dayOfWeek]}</span>
                </div>
                {slot.enabled ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(slot.dayOfWeek, "startTime", e.target.value)}
                      className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(slot.dayOfWeek, "endTime", e.target.value)}
                      className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                    />
                    <select
                      value={slot.slotDuration}
                      onChange={(e) => updateSlot(slot.dayOfWeek, "slotDuration", Number(e.target.value))}
                      className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Day off</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-4 text-base font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Vacation Days</h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newVacationDate}
              onChange={(e) => setNewVacationDate(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <input
              type="text"
              placeholder="Reason"
              value={newVacationReason}
              onChange={(e) => setNewVacationReason(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <button onClick={handleAddVacation} className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-white">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {vacations.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No vacation days set.</p>
            ) : (
              vacations.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{v.date}</div>
                    <div className="text-xs text-muted-foreground">{v.reason}</div>
                  </div>
                  <button onClick={() => handleRemoveVacation(v.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
