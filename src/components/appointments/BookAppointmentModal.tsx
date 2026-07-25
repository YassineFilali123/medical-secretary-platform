import { useState } from "react";
import { Calendar, Check, ChevronRight, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appointmentService } from "@/services/appointments";
import type { AppointmentType } from "@/types/appointment";

type BookAppointmentModalProps = {
  open: boolean;
  onClose: () => void;
  onBooked: () => void;
};

const TIME_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

const TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: "consultation", label: "Consultation" },
  { value: "follow-up", label: "Follow-up" },
  { value: "checkup", label: "Checkup" },
  { value: "emergency", label: "Emergency" },
];

export function BookAppointmentModal({ open, onClose, onBooked }: BookAppointmentModalProps) {
  const [step, setStep] = useState(0);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState<AppointmentType>("consultation");

  const doctors = appointmentService.getDoctors();
  const specialties = appointmentService.getSpecialties();

  const selectedDoctorData = doctors.find((d) => d.id === selectedDoctor);

  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  const handleBook = () => {
    if (!selectedDoctor || !selectedDate || !selectedTime || !reason) return;
    appointmentService.bookAppointment({
      doctorId: selectedDoctor,
      date: selectedDate,
      time: selectedTime,
      reason,
      type,
    });
    onBooked();
    onClose();
    setStep(0);
    setSelectedDoctor("");
    setSelectedDate("");
    setSelectedTime("");
    setReason("");
    setType("consultation");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {["Select Doctor", "Date & Time", "Confirm"].map((label, i) => (
            <span key={label} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={`rounded-full px-2 py-0.5 ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{i + 1}</span>
              {label}
            </span>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <Label>Specialty</Label>
            <Select value="all" onValueChange={() => {}}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="All Specialties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Label>Doctor</Label>
            <div className="grid gap-2 max-h-[240px] overflow-y-auto">
              {doctors.map((d) => (
                <button key={d.id} onClick={() => setSelectedDoctor(d.id)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selectedDoctor === d.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}>
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-white text-xs font-semibold">
                    {d.name.split(" ").slice(1).map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.specialty}</p>
                  </div>
                </button>
              ))}
            </div>
            <Button onClick={() => setStep(1)} disabled={!selectedDoctor} className="w-full rounded-xl">
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <Label>Date</Label>
            <div className="grid grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto">
              {availableDates.map((d) => (
                <button key={d} onClick={() => setSelectedDate(d)}
                  className={`rounded-lg border p-2 text-xs text-center transition-colors ${selectedDate === d ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:bg-accent"}`}>
                  <Calendar className="mx-auto mb-0.5 h-3 w-3" />
                  {new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </button>
              ))}
            </div>
            <Label>Time</Label>
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
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1 rounded-xl">Back</Button>
              <Button onClick={() => setStep(2)} disabled={!selectedDate || !selectedTime} className="flex-1 rounded-xl">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {selectedDoctorData && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium">{selectedDoctorData.name}</p>
                <p className="text-xs text-muted-foreground">{selectedDoctorData.specialty}</p>
                <p className="mt-1 text-xs text-muted-foreground">{selectedDate} at {selectedTime}</p>
              </div>
            )}
            <Label>Appointment Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AppointmentType)}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe your reason..." className="rounded-xl" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-xl">Back</Button>
              <Button onClick={handleBook} disabled={!reason} className="flex-1 rounded-xl">
                <Check className="mr-1 h-4 w-4" /> Confirm Booking
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
