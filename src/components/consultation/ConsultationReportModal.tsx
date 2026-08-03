import { useState } from "react";
import { AlertCircle, FileText, Loader2, Pill, Stethoscope, ClipboardList, CalendarClock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { ConsultationReport } from "@/services/consultation";

type Props = {
  open: boolean;
  patientName: string;
  error: string | null;
  onClose: () => void;
  onSubmit: (report: ConsultationReport) => Promise<boolean>;
};

const emptyReport: ConsultationReport = {
  diagnosis: "",
  notes: "",
  prescription: "",
  recommendedExaminations: "",
  followUpInstructions: "",
  nextAppointmentRecommended: false,
  nextAppointmentReason: "",
};

/**
 * Structured consultation report form.
 * Shown when the doctor clicks "End Consultation" — they must fill in at
 * least the diagnosis before closing.
 */
export function ConsultationReportModal({ open, patientName, error, onClose, onSubmit }: Props) {
  const [report, setReport] = useState<ConsultationReport>(emptyReport);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  if (!open) return null;

  const set = <K extends keyof ConsultationReport>(key: K, value: ConsultationReport[K]) =>
    setReport((r) => ({ ...r, [key]: value }));

  const canSubmit = report.diagnosis.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    const ok = await onSubmit(report);
    setBusy(false);
    if (ok) {
      setReport(emptyReport);
      setStep(1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Consultation Report</h2>
              <p className="text-xs text-muted-foreground">Patient: {patientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Step {step} of 2
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {step === 1 ? (
          <CardContent className="space-y-5 px-6 py-5">
            <Field
              icon={Stethoscope}
              label="Diagnosis"
              required
              value={report.diagnosis}
              onChange={(v) => set("diagnosis", v)}
              placeholder="Primary diagnosis and findings…"
            />

            <Field
              icon={FileText}
              label="Clinical Notes"
              value={report.notes}
              onChange={(v) => set("notes", v)}
              placeholder="Detailed observations, symptoms, examination results…"
            />

            <Field
              icon={Pill}
              label="Prescription"
              value={report.prescription}
              onChange={(v) => set("prescription", v)}
              placeholder="Medications, dosages, duration…"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-gradient-primary"
                disabled={!canSubmit}
                onClick={() => setStep(2)}
              >
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="space-y-5 px-6 py-5">
            <Field
              icon={ClipboardList}
              label="Recommended Examinations"
              value={report.recommendedExaminations}
              onChange={(v) => set("recommendedExaminations", v)}
              placeholder="Lab tests, imaging, referrals…"
            />

            <Field
              icon={FileText}
              label="Follow-up Instructions"
              value={report.followUpInstructions}
              onChange={(v) => set("followUpInstructions", v)}
              placeholder="Diet, activity restrictions, warning signs to watch for…"
            />

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  <Label className="cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={report.nextAppointmentRecommended}
                      onChange={(e) => set("nextAppointmentRecommended", e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    Recommend follow-up appointment
                  </Label>
                </div>
                {report.nextAppointmentRecommended && (
                  <Textarea
                    value={report.nextAppointmentReason}
                    onChange={(e) => set("nextAppointmentReason", e.target.value.slice(0, 255))}
                    placeholder="Reason for follow-up (e.g., review lab results, medication adjustment)…"
                    className="mt-3 min-h-[60px] rounded-xl"
                  />
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="rounded-xl bg-gradient-primary"
                disabled={busy}
                onClick={handleSubmit}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <FileText className="mr-1 h-4 w-4" /> End Consultation & Save Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        )}
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ElementType;
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 min-h-[80px] rounded-xl"
      />
    </div>
  );
}
