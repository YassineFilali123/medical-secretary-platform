import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookAppointmentModal } from "@/components/appointments";
import { useState } from "react";

export default function BookAppointmentPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Book Appointment</h1>
      </div>
      <BookAppointmentModal open={open} onClose={() => { setOpen(false); navigate("/patient/appointments"); }} onBooked={() => navigate("/patient/appointments")} />
    </div>
  );
}
