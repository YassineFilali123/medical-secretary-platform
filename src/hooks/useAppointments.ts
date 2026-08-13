import { useCallback, useMemo, useState } from "react";
import { appointmentService } from "@/services/appointments";
import {
  useAppointmentsQuery,
  useCancelAppointment,
  useRescheduleAppointment,
  useSetAppointmentStatus,
} from "@/hooks/queries/useAppointmentQueries";
import type { AppointmentQuery } from "@/types/appointment";

/**
 * Loads the appointments the signed-in user is allowed to see and wraps every
 * mutation in the same pattern: mark the row busy, call the API, refresh,
 * surface any error. Pages get the data and five verbs, and never touch fetch
 * or the query client directly.
 *
 * Scope is the server's job — this hook sends no user id. A patient's token
 * returns their own appointments, a doctor's returns theirs.
 *
 * Fetching and cache invalidation are React Query's (see
 * hooks/queries/useAppointmentQueries). The public shape below is unchanged
 * from the hand-rolled version, so every page consuming it keeps working
 * exactly as before — including `busyId` for per-row spinners and verbs that
 * resolve to a boolean so a dialog only closes on success.
 */
export function useAppointments(query: AppointmentQuery = {}) {
  const { data, isPending, error, refetch } = useAppointmentsQuery(query);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const cancelMutation = useCancelAppointment();
  const rescheduleMutation = useRescheduleAppointment();
  const statusMutation = useSetAppointmentStatus();

  const appointments = useMemo(() => data?.appointments ?? [], [data]);

  const run = useCallback(
    async (id: number, action: () => Promise<unknown>): Promise<boolean> => {
      setBusyId(id);
      setActionError(null);
      try {
        // The mutations invalidate on success, so the list refreshes itself.
        await action();
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "That action failed.");
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const cancel = useCallback(
    (id: number, reason?: string) => run(id, () => cancelMutation.mutateAsync({ id, reason })),
    [run, cancelMutation],
  );

  const reschedule = useCallback(
    (id: number, date: string, time: string) =>
      run(id, () => rescheduleMutation.mutateAsync({ id, date, time })),
    [run, rescheduleMutation],
  );

  const confirm = useCallback(
    (id: number) => run(id, () => statusMutation.mutateAsync({ id, status: "confirmed" })),
    [run, statusMutation],
  );

  const reject = useCallback(
    (id: number, reason?: string) =>
      run(id, () => statusMutation.mutateAsync({ id, status: "rejected", extra: { reason } })),
    [run, statusMutation],
  );

  const complete = useCallback(
    (id: number, notes?: string) =>
      run(id, () => statusMutation.mutateAsync({ id, status: "completed", extra: { notes } })),
    [run, statusMutation],
  );

  const counts = useMemo(() => appointmentService.countByStatus(appointments), [appointments]);

  return {
    appointments,
    counts,
    loading: isPending,
    error: error instanceof Error ? error.message : error ? "Failed to load appointments." : null,
    reload: useCallback(async () => {
      await refetch();
    }, [refetch]),
    busyId,
    actionError,
    dismissActionError: useCallback(() => setActionError(null), []),
    cancel,
    reschedule,
    confirm,
    reject,
    complete,
  };
}
