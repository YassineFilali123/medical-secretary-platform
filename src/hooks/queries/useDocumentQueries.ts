import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentRequestService, type DocumentType } from "@/services/document";
import { ratingService, type DoctorSummaryFilters } from "@/services/consultation";
import { queryKeys } from "@/lib/query-keys";

/**
 * React Query bindings for document requests and doctor ratings.
 *
 * File downloads are NOT here: `documentRequestService.download` streams a Blob
 * and triggers a browser save. There is nothing to cache, and caching a
 * one-shot side effect would be actively wrong.
 */

// ── Document requests ───────────────────────────────────────────────────────

export function useDocumentRequestsQuery(status?: string) {
  return useQuery({
    queryKey: queryKeys.documents.requests(status),
    queryFn: () => documentRequestService.list(status),
  });
}

/** The patient's own finished documents. */
export function useMyDocumentsQuery() {
  return useQuery({
    queryKey: queryKeys.documents.mine(),
    queryFn: () => documentRequestService.myDocuments(),
  });
}

function useInvalidateDocuments() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.documents.all });
    // The pending-request count appears on the secretary dashboard and in the
    // admin statistics.
    void qc.invalidateQueries({ queryKey: queryKeys.adminStatistics.all });
  };
}

export function useCreateDocumentRequestMutation() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (input: { documentType: DocumentType; note?: string }) =>
      documentRequestService.create(input),
    onSuccess: invalidate,
  });
}

export function useApproveDocumentMutation() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (input: Parameters<typeof documentRequestService.approve>[0]) =>
      documentRequestService.approve(input),
    onSuccess: invalidate,
  });
}

export function useRejectDocumentMutation() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (input: Parameters<typeof documentRequestService.reject>[0]) =>
      documentRequestService.reject(input),
    onSuccess: invalidate,
  });
}

// ── Doctor ratings ──────────────────────────────────────────────────────────

/** Admin: every doctor with their rating aggregates. */
export function useDoctorRatingsSummaryQuery(filters: DoctorSummaryFilters = {}) {
  return useQuery({
    queryKey: queryKeys.ratings.doctorsSummary(filters as Record<string, unknown>),
    queryFn: () => ratingService.doctorsSummary(filters),
  });
}

export function useDoctorRatingStatsQuery(doctorId: number | null) {
  return useQuery({
    queryKey: queryKeys.ratings.doctorStats(doctorId ?? 0),
    queryFn: () => ratingService.doctorStats(doctorId as number),
    enabled: doctorId !== null && doctorId > 0,
  });
}

export function useDoctorReviewsQuery(doctorId: number | null, limit = 50) {
  return useQuery({
    queryKey: queryKeys.ratings.doctorReviews(doctorId ?? 0, limit),
    queryFn: () => ratingService.doctorReviews(doctorId as number, limit),
    enabled: doctorId !== null && doctorId > 0,
  });
}

/** Patient: completed appointments still awaiting a rating. */
export function usePendingRatingsQuery() {
  return useQuery({
    queryKey: queryKeys.ratings.pending(),
    queryFn: () => ratingService.pending(),
  });
}

/**
 * A new rating changes the pending list, that doctor's aggregates, the admin
 * summary, and the platform average in statistics — so all of them go.
 */
export function useSubmitRatingMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { appointmentId: number; rating: number; review?: string }) =>
      ratingService.submit(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ratings.all });
      void qc.invalidateQueries({ queryKey: queryKeys.adminStatistics.all });
    },
  });
}
