import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, MessageSquare, Search, Star, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounced } from "@/hooks/useDebounced";
import {
  type DoctorRatingStats,
  type DoctorRatingSummary,
  type DoctorRatingsOverview,
  type DoctorSummaryFilters,
  type RatingReview,
} from "@/services/consultation";
import {
  useDoctorRatingStatsQuery,
  useDoctorRatingsSummaryQuery,
  useDoctorReviewsQuery,
} from "@/hooks/queries/useDocumentQueries";

type SortKey = NonNullable<DoctorSummaryFilters["sort"]>;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name (A–Z)" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
  { value: "reviews", label: "Most reviews" },
];

/** Read-only star row. */
function Stars({ value, size = "h-3.5 w-3.5" }: { value: number; size?: string }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size} ${s <= Math.round(value) ? "text-amber-400" : "text-muted-foreground/20"}`}
          fill={s <= Math.round(value) ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

function DistributionBars({ distribution }: { distribution: Record<number, number> }) {
  const max = Math.max(...Object.values(distribution), 1);

  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] ?? 0;
        return (
          <div key={star} className="flex items-center gap-2">
            <span className="w-3 text-right text-xs text-muted-foreground">{star}</span>
            <Star className="h-3 w-3 shrink-0 text-amber-400" fill="currentColor" />
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function DoctorRatingsPage() {
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState("all");
  const [sort, setSort] = useState<SortKey>("highest");
  const debouncedSearch = useDebounced(search, 300);

  const [selected, setSelected] = useState<DoctorRatingSummary | null>(null);
  const [starFilter, setStarFilter] = useState("all");

  // Search, filter and sort are all applied by the server; they form the query
  // key, so revisiting a previous combination is served from cache.
  const {
    data: summaryData,
    isPending: loading,
    error: queryError,
    refetch,
  } = useDoctorRatingsSummaryQuery({ q: debouncedSearch, minRating, sort });

  const doctors: DoctorRatingSummary[] = summaryData?.doctors ?? [];
  const overview: DoctorRatingsOverview | null = summaryData?.summary ?? null;
  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? "Could not load doctor ratings."
        : null;

  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Full review history for the selected doctor. Reuses the endpoints the
  // patient-facing rating views already use — no admin-specific copy. Both are
  // disabled until a doctor is picked.
  const statsQuery = useDoctorRatingStatsQuery(selected?.id ?? null);
  const reviewsQuery = useDoctorReviewsQuery(selected?.id ?? null, 100);

  const detailStats: DoctorRatingStats | null = statsQuery.data?.stats ?? null;
  const reviews: RatingReview[] = reviewsQuery.data?.reviews ?? [];
  const loadingDetail = selected !== null && (statsQuery.isPending || reviewsQuery.isPending);
  const detailError =
    statsQuery.error || reviewsQuery.error ? "Could not load this doctor's reviews." : null;

  // Picking a different doctor starts from "all ratings" again.
  useEffect(() => {
    setStarFilter("all");
  }, [selected]);

  const visibleReviews =
    starFilter === "all" ? reviews : reviews.filter((r) => r.rating === Number(starFilter));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Doctor Ratings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading || !overview
            ? "Loading…"
            : `${overview.doctorCount} doctors · ${overview.ratedDoctorCount} rated · ${overview.totalReviews} reviews` +
              (overview.platformAverage !== null
                ? ` · ${overview.platformAverage} average`
                : "")}
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={reload}>
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search doctor or specialty..."
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          aria-label="Filter by minimum rating"
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="all">Any rating</option>
          <option value="4.5">4.5★ and up</option>
          <option value="4">4★ and up</option>
          <option value="3">3★ and up</option>
          <option value="2">2★ and up</option>
          <option value="1">1★ and up</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort doctors"
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Doctor list */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : doctors.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No doctors match these filters.
            </div>
          ) : (
            doctors.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selected?.id === d.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{d.name}</span>
                      {d.status !== "active" && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-600 dark:bg-red-900/30 dark:text-red-300">
                          inactive
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{d.specialty}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {d.averageRating !== null ? (
                      <>
                        <div className="text-lg font-semibold leading-none">{d.averageRating}</div>
                        <div className="mt-1 flex justify-end">
                          <Stars value={d.averageRating} size="h-3 w-3" />
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">No ratings</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {d.totalReviews} {d.totalReviews === 1 ? "review" : "reviews"}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Selected doctor detail */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground shadow-soft">
              Select a doctor to see their reviews.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">{selected.name}</h2>
                    <p className="text-xs text-muted-foreground">{selected.specialty}</p>
                  </div>
                  {selected.lastRatedAt && (
                    <span className="text-xs text-muted-foreground">
                      Last rated {selected.lastRatedAt.slice(0, 10)}
                    </span>
                  )}
                </div>

                {detailError && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {detailError}
                  </div>
                )}

                {selected.totalReviews === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    This doctor has no ratings yet.
                  </p>
                ) : (
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-4xl font-bold">
                        {(detailStats?.averageRating ?? selected.averageRating)?.toFixed(1) ?? "—"}
                      </p>
                      <div className="mt-1 flex justify-center">
                        <Stars value={detailStats?.averageRating ?? selected.averageRating ?? 0} />
                      </div>
                      <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {detailStats?.totalReviews ?? selected.totalReviews} reviews
                      </p>
                    </div>
                    <div className="flex-1">
                      <DistributionBars
                        distribution={detailStats?.distribution ?? selected.distribution}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Review history */}
              {selected.totalReviews > 0 && (
                <div className="rounded-2xl border border-border bg-card shadow-soft">
                  <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <MessageSquare className="h-4 w-4" /> Review history
                      <span className="font-normal text-muted-foreground">
                        ({visibleReviews.length})
                      </span>
                    </h3>
                    <select
                      value={starFilter}
                      onChange={(e) => setStarFilter(e.target.value)}
                      aria-label="Filter reviews by rating"
                      className="h-9 rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="all">All ratings</option>
                      {[5, 4, 3, 2, 1].map((s) => (
                        <option key={s} value={String(s)}>
                          {s} star{s !== 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {loadingDetail ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : visibleReviews.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No reviews with this rating.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {visibleReviews.map((r) => (
                        <li key={r.id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {r.patientName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{r.patientName}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {r.appointmentDate}
                                  {r.appointmentReason ? ` · ${r.appointmentReason}` : ""}
                                </p>
                              </div>
                            </div>
                            <Stars value={r.rating} />
                          </div>
                          {r.review ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                              {r.review}
                            </p>
                          ) : (
                            <p className="mt-2 text-sm italic text-muted-foreground/60">
                              Rating only — no written review.
                            </p>
                          )}
                          <p className="mt-1.5 text-[11px] text-muted-foreground/60">
                            Submitted {r.createdAt.slice(0, 16)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
