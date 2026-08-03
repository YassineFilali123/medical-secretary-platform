import { useEffect, useState } from "react";
import { Star, MessageSquare, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ratingService, type DoctorRatingStats as Stats, type RatingReview } from "@/services/consultation";

type Props = {
  doctorId: number;
};

/**
 * Doctor rating statistics — shows average rating, total reviews,
 * distribution, and recent reviews.
 */
export function DoctorRatingStats({ doctorId }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviews, setReviews] = useState<RatingReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, reviewsRes] = await Promise.all([
          ratingService.doctorStats(doctorId),
          ratingService.doctorReviews(doctorId, 10),
        ]);
        setStats(statsRes.stats);
        setReviews(reviewsRes.reviews);
      } catch {
        // Non-critical — show empty state
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [doctorId]);

  if (loading) {
    return (
      <Card className="border-border shadow-soft">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Loading ratings…
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalReviews === 0) {
    return (
      <Card className="border-border shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-4 w-4 text-amber-400" />
            Patient Ratings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No ratings yet.</p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...Object.values(stats.distribution), 1);

  return (
    <Card className="border-border shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="h-4 w-4 text-amber-400" />
          Patient Ratings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold">{stats.averageRating?.toFixed(1) ?? "—"}</p>
            <div className="mt-1 flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${
                    s <= Math.round(stats.averageRating ?? 0)
                      ? "text-amber-400"
                      : "text-muted-foreground/20"
                  }`}
                  fill={s <= Math.round(stats.averageRating ?? 0) ? "currentColor" : "none"}
                />
              ))}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Distribution bars */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star] ?? 0;
              const pct = (count / maxCount) * 100;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-4 text-right text-xs text-muted-foreground">{star}</span>
                  <Star className="h-3 w-3 text-amber-400" fill="currentColor" />
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent reviews */}
        {reviews.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Recent Reviews
            </p>
            <div className="space-y-3">
              {reviews.slice(0, 5).map((r) => (
                <div key={r.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {r.patientName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{r.patientName}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3 w-3 ${
                            s <= r.rating ? "text-amber-400" : "text-muted-foreground/20"
                          }`}
                          fill={s <= r.rating ? "currentColor" : "none"}
                        />
                      ))}
                    </div>
                  </div>
                  {r.review && (
                    <p className="mt-1.5 text-xs text-muted-foreground">{r.review}</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground/60">
                    {r.appointmentDate}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
