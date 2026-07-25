import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Star, Calendar, Clock, ChevronRight, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { patientService } from "@/services/patient";
import type { Doctor } from "@/types/patient";
import { addDays, format, startOfWeek } from "date-fns";

const TIME_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

function DoctorCard({ doctor, onSelect, selected }: { doctor: Doctor; onSelect: () => void; selected: boolean }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-accent/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-white">
          {doctor.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{doctor.name}</div>
          <div className="text-xs text-muted-foreground">{doctor.specialty}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium">{doctor.rating}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {doctor.availableToday ? "Available today" : `Next: ${doctor.nextSlot}`}
            </span>
          </div>
        </div>
        {doctor.availableToday && <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">Available</span>}
      </div>
    </button>
  );
}

export default function BookAppointmentPage() {
  const [step, setStep] = useState<"doctor" | "datetime" | "confirm" | "done">("doctor");
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [confirmedAppt, setConfirmedAppt] = useState<{ doctorName: string; date: string; time: string } | null>(null);

  const doctors = useMemo(() => patientService.getDoctors(), []);
  const specialties = useMemo(() => patientService.getSpecialties(), []);

  const filteredDoctors = useMemo(() => {
    let result = doctors;
    if (specialty !== "all") result = result.filter((d) => d.specialty === specialty);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q));
    }
    return result;
  }, [doctors, search, specialty]);

  const weekDates = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 14 }, (_, i) => addDays(start, i));
  }, []);

  const handleBook = () => {
    if (!selectedDoctor || !selectedDate || !selectedTime || !reason) return;
    const appt = patientService.bookAppointment({ doctorId: selectedDoctor.id, date: selectedDate, time: selectedTime, reason });
    setConfirmedAppt({ doctorName: appt.doctorName, date: appt.date, time: appt.time });
    setStep("done");
  };

  const reset = () => {
    setStep("doctor");
    setSelectedDoctor(null);
    setSelectedDate("");
    setSelectedTime("");
    setReason("");
    setConfirmedAppt(null);
  };

  if (step === "done" && confirmedAppt) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Appointment Confirmed!</h1>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <p className="text-sm font-medium">{confirmedAppt.doctorName}</p>
            <p className="text-sm text-muted-foreground mt-1">{confirmedAppt.date} at {confirmedAppt.time}</p>
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={reset} variant="outline" className="rounded-xl">Book Another</Button>
            <Link to="/patient/appointments" className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-primary px-4 text-sm font-medium text-white shadow-soft">View Appointments</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Book an Appointment</h1>

      {/* Progress */}
      <div className="flex items-center gap-2 text-sm">
        {["doctor", "datetime", "confirm"].map((s, i) => (
          <span key={s} className={`flex items-center gap-1 ${step === s ? "text-primary font-medium" : "text-muted-foreground"}`}>
            <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
              step === s ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>{i + 1}</span>
            <span className="hidden sm:inline">{s === "doctor" ? "Doctor" : s === "datetime" ? "Date & Time" : "Confirm"}</span>
            {i < 2 && <ChevronRight className="h-3 w-3" />}
          </span>
        ))}
      </div>

      {step === "doctor" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search doctors or specialties..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
              <option value="all">All Specialties</option>
              {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredDoctors.map((d) => (
              <DoctorCard key={d.id} doctor={d} selected={selectedDoctor?.id === d.id} onSelect={() => { setSelectedDoctor(d); setStep("datetime"); }} />
            ))}
          </div>
          {filteredDoctors.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No doctors match your search.</p>}
        </>
      )}

      {step === "datetime" && selectedDoctor && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Select Date</h2>
            <div className="grid grid-cols-7 gap-1">
              {weekDates.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isSelected = selectedDate === dateStr;
                const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`rounded-lg py-2 text-center text-xs transition-colors ${
                      isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-primary/5 text-primary" : "hover:bg-accent"
                    }`}
                  >
                    <div className="font-medium">{format(day, "EEE")}</div>
                    <div className="text-sm font-semibold">{format(day, "d")}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-base font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Select Time</h2>
            {selectedDate ? (
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className={`rounded-xl border py-2.5 text-sm transition-colors ${
                      selectedTime === t ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Please select a date first.</p>
            )}
          </div>

          <div className="lg:col-span-2 flex justify-between">
            <Button variant="ghost" onClick={() => setStep("doctor")} className="rounded-xl">Back</Button>
            <Button disabled={!selectedDate || !selectedTime} onClick={() => setStep("confirm")} className="rounded-xl bg-gradient-primary">
              Continue to Confirm
            </Button>
          </div>
        </div>
      )}

      {step === "confirm" && selectedDoctor && (
        <div className="max-w-lg mx-auto space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
            <h2 className="text-base font-semibold">Appointment Summary</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-white shrink-0">
                  {selectedDoctor.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-medium">{selectedDoctor.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedDoctor.specialty}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-medium">{selectedDate}</div>
                  <div className="text-xs text-muted-foreground">{selectedTime}</div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Reason for visit</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly describe your symptoms or reason for the appointment..."
                  className="mt-1 h-24 w-full rounded-xl border border-input bg-background p-3 text-sm resize-none"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep("datetime")} className="rounded-xl">Back</Button>
            <Button disabled={!reason.trim()} onClick={handleBook} className="rounded-xl bg-gradient-primary">
              Confirm Booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
