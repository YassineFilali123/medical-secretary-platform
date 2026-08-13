import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentService } from "@/services/appointments";
import { specialtyService } from "@/services/specialty";
import { queryKeys } from "@/lib/query-keys";
import type { AppointmentQuery, BookingData } from "@/types/appointment";

/**
 * React Query bindings for the appointment endpoints.
 *
 * These wrap `appointmentService` rather than calling fetch themselves — the
 * service remains the single place that knows about URLs, headers and error
 * shapes, so there is no duplicated API logic.
 *
 * Anything that writes an appointment invalidates BOTH the appointment lists
 * and availability: booking, cancelling or rescheduling frees or takes a slot,
 * so a stale slot picker would offer times that are already gone.
 */

export function useAppointmentsQuery(query: AppointmentQuery = {}) {
  return useQuery({
    queryKey: queryKeys.appointments.list(query as Record<string, unknown>),
    queryFn: () => appointmentService.list(query),
  });
}

export function useAppointmentQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(String(id)),
    queryFn: () => appointmentService.byId(id as number),
    enabled: id !== null && Number.isInteger(id) && id > 0,
  });
}

/** The bookable doctor directory. */
export function useDoctorsQuery(specialtyId?: number | "all") {
  return useQuery({
    queryKey: [...queryKeys.appointments.doctors(), specialtyId ?? "all"],
    queryFn: () => appointmentService.doctors(specialtyId),
  });
}

export function useSpecialtiesQuery() {
  return useQuery({
    queryKey: queryKeys.specialties.list(),
    queryFn: () => specialtyService.list(),
  });
}

/** Invalidates everything an appointment write can affect. */
export function useInvalidateAppointments() {
  const qc = useQueryClient();

  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
    void qc.invalidateQueries({ queryKey: queryKeys.availability.all });
    // Dashboards and the admin statistics screen count appointments.
    void qc.invalidateQueries({ queryKey: queryKeys.adminStatistics.all });
  };
}

export function useBookAppointment() {
  const invalidate = useInvalidateAppointments();

  return useMutation({
    mutationFn: (input: BookingData) => appointmentService.book(input),
    onSuccess: invalidate,
  });
}

export function useCancelAppointment() {
  const invalidate = useInvalidateAppointments();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      appointmentService.cancel(id, reason),
    onSuccess: invalidate,
  });
}

export function useRescheduleAppointment() {
  const invalidate = useInvalidateAppointments();

  return useMutation({
    mutationFn: ({ id, date, time }: { id: number; date: string; time: string }) =>
      appointmentService.reschedule(id, date, time),
    onSuccess: invalidate,
  });
}

export function useSetAppointmentStatus() {
  const invalidate = useInvalidateAppointments();

  return useMutation({
    mutationFn: ({
      id,
      status,
      extra,
    }: {
      id: number;
      status: "confirmed" | "rejected" | "completed";
      extra?: { reason?: string; notes?: string };
    }) => appointmentService.setStatus(id, status, extra),
    onSuccess: invalidate,
  });
}
