import { useState } from "react";
import { Calendar, Clock, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Appointment } from "@/types/appointment";

type RescheduleAppointmentModalProps = {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
};

const TIME_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

export function RescheduleAppointmentModal({ open, appointment, onClose, onConfirm }: RescheduleAppointmentModalProps) {
  const [selectedDate, setSelectedDate] = useState(appointment?.date ?? "");
  const [selectedTime, setSelectedTime] = useState(appointment?.time ?? "");

  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return;
    onConfirm(selectedDate, selectedTime);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10">
            <RefreshCw className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Reschedule Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {appointment && (
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="text-sm text-muted-foreground">Current: {appointment.date} at {appointment.time}</p>
            </div>
          )}
          <Label>New Date</Label>
          <div className="grid grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto">
            {availableDates.map((d) => (
              <button key={d} onClick={() => setSelectedDate(d)}
                className={`rounded-lg border p-2 text-xs text-center transition-colors ${selectedDate === d ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:bg-accent"}`}>
                <Calendar className="mx-auto mb-0.5 h-3 w-3" />
                {new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </button>
            ))}
          </div>
          <Label>New Time</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {TIME_SLOTS.map((t) => (
              <button key={t} onClick={() => setSelectedTime(t)}
                className={`rounded-lg border p-2 text-xs transition-colors ${selectedTime === t ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:bg-accent"}`}>
                <Clock className="mx-auto mb-0.5 h-3 w-3" />
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={handleConfirm} disabled={!selectedDate || !selectedTime} className="flex-1 rounded-xl">
              <RefreshCw className="mr-1 h-4 w-4" /> Reschedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
