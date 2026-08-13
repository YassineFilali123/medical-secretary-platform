import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doctorPatientService } from "@/services/patients";
import { doctorConversationService, type DoctorConversationFilters } from "@/services/doctor-conversations";
import { availabilityService } from "@/services/availability";
import { queryKeys } from "@/lib/query-keys";

/**
 * React Query bindings for the doctor-facing endpoints.
 *
 * All of them are already scoped server-side to the signed-in doctor, so the
 * keys carry no doctor id — a different doctor is a different token, and the
 * cache is discarded on sign-out with the rest of the page.
 */

// ── Patients ────────────────────────────────────────────────────────────────

export function useDoctorPatientsQuery(search?: string) {
  return useQuery({
    queryKey: queryKeys.doctorPatients.list(search),
    queryFn: () => doctorPatientService.list(search),
  });
}

export function useDoctorPatientRecordQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.doctorPatients.record(id ?? 0),
    queryFn: () => doctorPatientService.record(id as number),
    enabled: id !== null && Number.isInteger(id) && id > 0,
  });
}

// ── AI conversations (read-only) ────────────────────────────────────────────

export function useDoctorConversationsQuery(filters: DoctorConversationFilters = {}) {
  return useQuery({
    queryKey: queryKeys.doctorConversations.list(filters as Record<string, unknown>),
    queryFn: () => doctorConversationService.list(filters),
  });
}

export function useDoctorConversationQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.doctorConversations.detail(id ?? 0),
    queryFn: () => doctorConversationService.detail(id as number),
    enabled: id !== null && Number.isInteger(id) && id > 0,
    // A doctor's own patient's conversation cannot become someone else's, and
    // the transcript is read-only, so one retry on a 404 is pointless.
    retry: false,
  });
}

// ── Availability ────────────────────────────────────────────────────────────

export function useAvailabilityQuery() {
  return useQuery({
    queryKey: queryKeys.availability.schedule(),
    queryFn: () => availabilityService.get(),
  });
}

/** Bookable slots for one doctor over a date range. */
export function useAvailabilitySlotsQuery(
  doctorId: number | null,
  opts: { from?: string; to?: string; excludeAppointmentId?: number } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.availability.slots(
      doctorId ?? 0,
      opts.from ?? "",
      // The excluded appointment changes which slots come back, so it has to be
      // part of the key or a reschedule picker would reuse the booking cache.
      `${opts.to ?? ""}:${opts.excludeAppointmentId ?? ""}`,
    ),
    queryFn: () => availabilityService.slots(doctorId as number, opts),
    enabled: enabled && doctorId !== null && doctorId > 0,
  });
}

/**
 * Changing a schedule or booking time off changes which slots exist, so both
 * the schedule and every cached slot range are invalidated together.
 */
function useInvalidateAvailability() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.availability.all });
  };
}

export function useSaveScheduleMutation() {
  const invalidate = useInvalidateAvailability();

  return useMutation({
    mutationFn: (days: Parameters<typeof availabilityService.saveSchedule>[0]) =>
      availabilityService.saveSchedule(days),
    onSuccess: invalidate,
  });
}

export function useAddTimeOffMutation() {
  const invalidate = useInvalidateAvailability();

  return useMutation({
    mutationFn: (input: Parameters<typeof availabilityService.addTimeOff>[0]) =>
      availabilityService.addTimeOff(input),
    onSuccess: invalidate,
  });
}

export function useRemoveTimeOffMutation() {
  const invalidate = useInvalidateAvailability();

  return useMutation({
    mutationFn: (id: number) => availabilityService.removeTimeOff(id),
    onSuccess: invalidate,
  });
}
