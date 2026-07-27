import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Loader2, Search, Stethoscope } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appointmentService, AppointmentError } from "@/services/appointments";
import { specialtyService, type Specialty } from "@/services/specialty";
import { SlotPicker, type SlotChoice } from "./SlotPicker";
import { TYPE_LABELS, type AppointmentType, type Doctor, type Patient } from "@/types/appointment";

type BookAppointmentModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful booking so the caller can refresh its list. */
  onBooked: () => void;
  /**
   * "secretary" adds a patient-picker step; the appointment is then confirmed
   * immediately, because the secretary has already agreed the time in person.
   */
  mode?: "patient" | "secretary";
};

const MAX_REASON = 500;

export function BookAppointmentModal({ open, onClose, onBooked, mode = "patient" }: BookAppointmentModalProps) {
  const forSomeoneElse = mode === "secretary";
  const steps = forSomeoneElse
    ? ["Patient", "Doctor", "Time", "Confirm"]
    : ["Doctor", "Time", "Confirm"];

  const [step, setStep] = useState(0);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [slot, setSlot] = useState<SlotChoice | null>(null);
  const [type, setType] = useState<AppointmentType>("consultation");
  const [reason, setReason] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start clean every time the dialog opens: a half-finished booking left over
  // from last time is worse than no state at all.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setPatient(null);
    setPatientSearch("");
    setDoctor(null);
    setSpecialtyFilter("all");
    setSlot(null);
    setType("consultation");
    setReason("");
    setError(null);
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoadingDoctors(true);
    Promise.all([appointmentService.doctors(), specialtyService.list()])
      .then(([docs, specs]) => {
        setDoctors(docs);
        setSpecialties(specs.filter((s) => s.isActive));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load doctors."))
      .finally(() => setLoadingDoctors(false));
  }, [open]);

  // Debounced so typing a name does not fire a request per keystroke.
  useEffect(() => {
    if (!open || !forSomeoneElse) return;
    setLoadingPatients(true);
    const timer = setTimeout(() => {
      appointmentService
        .patients(patientSearch)
        .then(setPatients)
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load patients."))
        .finally(() => setLoadingPatients(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [open, forSomeoneElse, patientSearch]);

  const visibleDoctors = useMemo(() => {
    if (specialtyFilter === "all") return doctors;
    return doctors.filter((d) => String(d.specialtyId) === specialtyFilter);
  }, [doctors, specialtyFilter]);

  const stepIndex = { patient: 0, doctor: forSomeoneElse ? 1 : 0, time: forSomeoneElse ? 2 : 1, confirm: forSomeoneElse ? 3 : 2 };

  const handleBook = async () => {
    if (!doctor || !slot || !reason.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await appointmentService.book({
        doctorId: doctor.id,
        date: slot.date,
        time: slot.time,
        reason: reason.trim(),
        type,
        ...(forSomeoneElse && patient ? { patientId: patient.id } : {}),
      });
      onBooked();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Booking failed.";
      setError(message);
      // Someone else took the slot between loading it and confirming. Send the
      // user back to the picker, which refetches and no longer offers it.
      if (err instanceof AppointmentError && err.code === "SLOT_TAKEN") {
        setSlot(null);
        setStep(stepIndex.time);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{forSomeoneElse ? "New Appointment" : "Book Appointment"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {steps.map((label, i) => (
            <span key={label} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span
                className={`rounded-full px-2 py-0.5 ${
                  i <= step ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {i + 1}
              </span>
              {label}
            </span>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ---------------------------------------------------- patient */}
        {forSomeoneElse && step === stepIndex.patient && (
          <div className="space-y-3">
            <Label>Patient</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <div className="grid max-h-[240px] gap-2 overflow-y-auto pr-1">
              {loadingPatients && patients.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">Searching…</p>
              ) : patients.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">No patients found.</p>
              ) : (
                patients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPatient(p)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      patient?.id === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-primary text-xs font-semibold text-white">
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
            <Button onClick={() => setStep(step + 1)} disabled={!patient} className="w-full rounded-xl">
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ----------------------------------------------------- doctor */}
        {step === stepIndex.doctor && (
          <div className="space-y-3">
            <Label>Specialty</Label>
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="All specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All specialties</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label>Doctor</Label>
            <div className="grid max-h-[240px] gap-2 overflow-y-auto pr-1">
              {loadingDoctors ? (
                <p className="flex items-center justify-center gap-2 p-4 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading doctors…
                </p>
              ) : visibleDoctors.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  No doctors in this specialty.
                </p>
              ) : (
                visibleDoctors.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDoctor(d);
                      // Slots belong to a doctor; keep no stale choice.
                      setSlot(null);
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      doctor?.id === d.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-primary text-xs font-semibold text-white">
                      {initials(d.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Stethoscope className="h-3 w-3" /> {d.specialty}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-2">
              {forSomeoneElse && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 rounded-xl">
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              )}
              <Button onClick={() => setStep(step + 1)} disabled={!doctor} className="flex-1 rounded-xl">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------- time */}
        {step === stepIndex.time && doctor && (
          <div className="space-y-3">
            <SlotPicker doctorId={doctor.id} value={slot} onChange={setSlot} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 rounded-xl">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(step + 1)} disabled={!slot} className="flex-1 rounded-xl">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- confirm */}
        {step === stepIndex.confirm && doctor && slot && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border p-3">
              {patient && <p className="text-sm font-medium">{patient.name}</p>}
              <p className={patient ? "text-xs text-muted-foreground" : "text-sm font-medium"}>
                {doctor.name} · {doctor.specialty}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatLongDate(slot.date)} at {slot.time}
              </p>
            </div>

            <Label>Appointment type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AppointmentType)}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as AppointmentType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between">
              <Label>Reason</Label>
              <span className="text-[11px] text-muted-foreground">
                {reason.length}/{MAX_REASON}
              </span>
            </div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
              placeholder="Describe the reason for the visit…"
              className="rounded-xl"
            />

            <p className="text-xs text-muted-foreground">
              {forSomeoneElse
                ? "This appointment will be confirmed straight away."
                : "The doctor will review your request and confirm it."}
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={saving}
                className="flex-1 rounded-xl"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleBook} disabled={!reason.trim() || saving} className="flex-1 rounded-xl">
                {saving ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Booking…
                  </>
                ) : (
                  <>
                    <Check className="mr-1 h-4 w-4" /> Confirm
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatLongDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
