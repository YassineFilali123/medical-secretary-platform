import { useState } from "react";
import { AlertCircle, Loader2, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ratingService } from "@/services/consultation";

type Props = {
  open: boolean;
  appointmentId: number;
  doctorName: string;
  onClose: () => void;
  onSubmitted: () => void;
};

const STAR_LABELS = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

/**
 * Patient rating modal — appears after a consultation is completed.
 * 1-5 stars + optional written review.
 */
export function RatingModal({ open, appointmentId, doctorName, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (rating < 1) return;
    setBusy(true);
    setError(null);
    try {
      await ratingService.submit({
        appointmentId,
        rating,
        review: review.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        onSubmitted();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your rating.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="px-6 py-5 text-center">
          {submitted ? (
            <div className="space-y-3 py-6">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Star className="h-8 w-8 text-green-600 dark:text-green-400" fill="currentColor" />
              </div>
              <h2 className="text-xl font-semibold">Thank you!</h2>
              <p className="text-sm text-muted-foreground">
                Your feedback helps improve the quality of care.
              </p>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10">
                <MessageSquare className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Rate Your Experience</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                How was your consultation with <strong>{doctorName}</strong>?
              </p>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}

              {/* Star selector */}
              <div className="mt-6 flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="transition-transform hover:scale-110"
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`h-10 w-10 transition-colors ${
                        star <= (hovered || rating)
                          ? "text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                      fill={star <= (hovered || rating) ? "currentColor" : "none"}
                    />
                  </button>
                ))}
              </div>
              {(hovered || rating) > 0 && (
                <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  {STAR_LABELS[(hovered || rating) - 1]}
                </p>
              )}

              {/* Optional review */}
              <div className="mt-5">
                <Textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value.slice(0, 1000))}
                  placeholder="Leave an optional review about your experience…"
                  className="min-h-[80px] rounded-xl"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {review.length}/1000 characters (optional)
                </p>
              </div>

              <div className="mt-5 flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
                  Skip
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-gradient-primary"
                  disabled={busy || rating < 1}
                  onClick={handleSubmit}
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    "Submit Rating"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
