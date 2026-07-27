import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { appointmentService } from "@/services/appointments";
import type { Appointment, AppointmentQuery } from "@/types/appointment";

type Status = "loading" | "ready" | "error";

/**
 * Loads the appointments the signed-in user is allowed to see and wraps every
 * mutation in the same pattern: mark the row busy, call the API, reload, surface
 * any error. Pages get the data and four verbs, and never touch fetch directly.
 *
 * Scope is the server's job — this hook sends no user id. A patient's token
 * returns their own appointments, a doctor's returns theirs.
 */
export function useAppointments(query: AppointmentQuery = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Callers build the query inline, so a new object arrives every render.
  // Comparing its contents rather than its identity keeps the effect from
  // refetching forever.
  const queryKey = JSON.stringify(query);
  const stableQuery = useMemo(() => JSON.parse(queryKey) as AppointmentQuery, [queryKey]);

  // Guards against a slow first response overwriting a newer one.
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const current = ++requestId.current;
    try {
      const data = await appointmentService.list(stableQuery);
      if (current !== requestId.current) return;
      setAppointments(data.appointments);
      setStatus("ready");
      setError(null);
    } catch (err) {
      if (current !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Failed to load appointments.");
      setStatus("error");
    }
  }, [stableQuery]);

  useEffect(() => {
    setStatus("loading");
    void reload();
  }, [reload]);

  /**
   * Run one mutation against one appointment.
   * @returns true if it succeeded, so callers can close a dialog only on success.
   */
  const run = useCallback(
    async (id: number, action: () => Promise<unknown>): Promise<boolean> => {
      setBusyId(id);
      setActionError(null);
      try {
        await action();
        await reload();
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "That action failed.");
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [reload],
  );

  const cancel = useCallback(
    (id: number, reason?: string) => run(id, () => appointmentService.cancel(id, reason)),
    [run],
  );

  const reschedule = useCallback(
    (id: number, date: string, time: string) =>
      run(id, () => appointmentService.reschedule(id, date, time)),
    [run],
  );

  const confirm = useCallback(
    (id: number) => run(id, () => appointmentService.setStatus(id, "confirmed")),
    [run],
  );

  const reject = useCallback(
    (id: number, reason?: string) => run(id, () => appointmentService.setStatus(id, "rejected", { reason })),
    [run],
  );

  const complete = useCallback(
    (id: number, notes?: string) => run(id, () => appointmentService.setStatus(id, "completed", { notes })),
    [run],
  );

  const counts = useMemo(() => appointmentService.countByStatus(appointments), [appointments]);

  return {
    appointments,
    counts,
    loading: status === "loading",
    error,
    reload,
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
