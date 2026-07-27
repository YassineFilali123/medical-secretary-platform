import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookAppointmentModal } from "@/components/appointments";
import { ROUTES } from "@/constants/routes";

/**
 * The booking wizard as its own page, for the "Book Appointment" links in the
 * sidebar and dashboard. Closing it — whether or not anything was booked —
 * returns to the appointment list, so the user never lands on a blank page.
 */
export default function BookAppointmentPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const leave = () => {
    setOpen(false);
    navigate(ROUTES.PATIENT_APPOINTMENTS);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={leave}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Book Appointment</h1>
      </div>

      <BookAppointmentModal open={open} onClose={leave} onBooked={leave} />
    </div>
  );
}
