import { UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { appointmentService } from "@/services/appointments";
import type { Appointment } from "@/types/appointment";

type AssignDoctorModalProps = {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onConfirm: (doctorId: string) => void;
};

export function AssignDoctorModal({ open, appointment, onClose, onConfirm }: AssignDoctorModalProps) {
  const doctors = appointmentService.getDoctors();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Assign Doctor</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {doctors.map((d) => (
            <button key={d.id} onClick={() => { onConfirm(d.id); onClose(); }}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${appointment?.doctorId === d.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}>
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
        <Button variant="outline" onClick={onClose} className="w-full rounded-xl">Cancel</Button>
      </DialogContent>
    </Dialog>
  );
}
