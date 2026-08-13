import { useState } from "react";
import { Star, Calendar, Clock, Loader2, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RatingModal } from "@/components/consultation/RatingModal";
import { type PendingRatingAppointment } from "@/services/consultation";
import { usePendingRatingsQuery } from "@/hooks/queries/useDocumentQueries";

/**
 * Patient ratings page — shows completed appointments that need rating,
 * and lets the patient submit 1-5 star ratings with optional reviews.
 */
export default function PatientRatingsPage() {
  const [ratingTarget, setRatingTarget] = useState<PendingRatingAppointment | null>(null);

  // Submitting a rating invalidates this query (see useSubmitRatingMutation),
  // so the rated appointment drops off the list on its own.
  const { data, isPending: loading, refetch } = usePendingRatingsQuery();
  const pending: PendingRatingAppointment[] = data?.appointments ?? [];

  const handleRatingSubmitted = () => {
    setRatingTarget(null);
    void refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rate Your Consultations</h1>
        <p className="text-sm text-muted-foreground">
          Help us improve by rating your experience with your doctors.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground shadow-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : pending.length === 0 ? (
        <Card className="border-border shadow-soft">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">All caught up!</p>
              <p className="text-sm text-muted-foreground">
                You have no consultations to rate. New ratings will appear here after your appointments.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((appt) => (
            <Card key={appt.appointmentId} className="border-border shadow-soft">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  {appt.doctorAvatar ? (
                    <img
                      src={appt.doctorAvatar}
                      alt={appt.doctorName}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-lg font-semibold text-white">
                      {appt.doctorName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{appt.doctorName}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {appt.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {appt.time}
                      </span>
                    </div>
                    {appt.reason && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{appt.reason}</p>
                    )}
                  </div>
                </div>
                <Button
                  className="rounded-xl bg-gradient-primary"
                  onClick={() => setRatingTarget(appt)}
                >
                  <Star className="mr-1 h-4 w-4" /> Rate
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RatingModal
        open={!!ratingTarget}
        appointmentId={ratingTarget?.appointmentId ?? 0}
        doctorName={ratingTarget?.doctorName ?? ""}
        onClose={() => setRatingTarget(null)}
        onSubmitted={handleRatingSubmitted}
      />
    </div>
  );
}
