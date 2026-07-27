import { useCallback, useEffect, useRef, useState } from "react";
import { consultationService, secondsBetween, type ActiveConsultation } from "@/services/consultation";

/** How often the elapsed/remaining clock ticks. */
const TICK_MS = 1_000;

/** How often to re-read the consultation, so an approval elsewhere shows up. */
const REFRESH_MS = 20_000;

export type ConsultationClock = {
  elapsedSeconds: number;
  remainingSeconds: number;
  /** True once the scheduled end time has passed. */
  overrunning: boolean;
  overrunSeconds: number;
};

/**
 * Drives the doctor's live screen: the running consultation, what is queued
 * behind it, and a once-a-second clock.
 *
 * The clock is anchored to the SERVER's time, not the browser's. A laptop whose
 * clock is ten minutes fast would otherwise show a consultation running over
 * before it had started — and this stack has already been bitten once by PHP
 * and the database disagreeing about the hour.
 */
export function useLiveConsultation() {
  const [data, setData] = useState<ActiveConsultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Server time minus browser time, in ms. Added to Date.now() everywhere.
  const skewMs = useRef(0);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const fresh = await consultationService.active();
      skewMs.current = new Date(fresh.serverTime).getTime() - Date.now();
      setData(fresh);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the consultation.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date(Date.now() + skewMs.current)), TICK_MS);
    const refresh = setInterval(() => void load(true), REFRESH_MS);

    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [load]);

  const consultation = data?.consultation ?? null;

  const clock: ConsultationClock | null = consultation
    ? (() => {
        // startedAt is when the doctor actually began; fall back to the
        // scheduled start for a row that somehow lacks it.
        const started = new Date(consultation.startedAt ?? consultation.scheduledStart);
        const scheduledEnd = new Date(consultation.scheduledEnd);
        const elapsed = secondsBetween(started, now);
        const remaining = Math.floor((scheduledEnd.getTime() - now.getTime()) / 1000);

        return {
          elapsedSeconds: elapsed,
          remainingSeconds: Math.max(0, remaining),
          overrunning: remaining < 0,
          overrunSeconds: remaining < 0 ? -remaining : 0,
        };
      })()
    : null;

  return {
    consultation,
    upNext: data?.upNext ?? [],
    pendingRequest: data?.pendingRequest ?? null,
    clock,
    loading,
    error,
    reload: () => load(true),
    start: useCallback(
      async (appointmentId: number) => {
        await consultationService.start(appointmentId);
        await load(true);
      },
      [load],
    ),
    end: useCallback(
      async (appointmentId: number, notes?: string) => {
        await consultationService.end(appointmentId, notes);
        await load(true);
      },
      [load],
    ),
  };
}
