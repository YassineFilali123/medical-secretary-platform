import { useCallback, useEffect, useRef, useState } from "react";
import { consultationService, secondsBetween, type ActiveConsultation, type PatientInfo, type PreviousConsultation } from "@/services/consultation";

/** How often the elapsed/remaining clock ticks. */
const TICK_MS = 1_000;

/** How often to re-read the consultation, so an approval elsewhere shows up. */
const REFRESH_MS = 20_000;

/** How often to check for auto-start and send 5-min reminders. */
const AUTO_START_MS = 30_000;

export type ConsultationClock = {
  elapsedSeconds: number;
  remainingSeconds: number;
  /** True once the scheduled end time has passed. */
  overrunning: boolean;
  overrunSeconds: number;
};

/** Extended consultation type with patient data from the enriched active endpoint. */
export type EnrichedConsultation = NonNullable<ActiveConsultation["consultation"]> & {
  patientInfo?: PatientInfo | null;
  previousConsultations?: PreviousConsultation[];
};

/**
 * Notification sound — a short chime.
 * Uses the Web Audio API so no external file is needed.
 */
function playNotificationSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);

    // Second tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.7);
  } catch {
    // Audio not available — fail silently
  }
}

/**
 * Drives the doctor's live screen: the running consultation, what is queued
 * behind it, and a once-a-second clock.
 *
 * Also handles auto-start: every 30 seconds, asks the backend to start any
 * appointment whose time has come and send 5-minute reminders.
 *
 * The clock is anchored to the SERVER's time, not the browser's.
 */
export function useLiveConsultation() {
  const [data, setData] = useState<ActiveConsultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Server time minus browser time, in ms. Added to Date.now() everywhere.
  const skewMs = useRef(0);

  // Track if we've already played a sound for the current consultation
  const lastStartedId = useRef<number | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const fresh = await consultationService.active();
      skewMs.current = new Date(fresh.serverTime).getTime() - Date.now();
      setData(fresh);
      setError(null);

      // Play notification sound when a new consultation starts
      if (fresh.consultation && fresh.consultation.appointmentId !== lastStartedId.current) {
        lastStartedId.current = fresh.consultation.appointmentId;
        playNotificationSound();
      } else if (!fresh.consultation) {
        lastStartedId.current = null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the consultation.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // Auto-start polling: asks the backend to start due appointments
  const autoStartPoll = useCallback(async () => {
    try {
      const result = await consultationService.autoStart();
      if (result.started) {
        // Reload the consultation data immediately
        await load(true);
      }
    } catch {
      // Auto-start failure is non-critical; next poll will retry
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date(Date.now() + skewMs.current)), TICK_MS);
    const refresh = setInterval(() => void load(true), REFRESH_MS);
    const autoStart = setInterval(() => void autoStartPoll(), AUTO_START_MS);

    // Run auto-start immediately on mount too
    void autoStartPoll();

    return () => {
      clearInterval(tick);
      clearInterval(refresh);
      clearInterval(autoStart);
    };
  }, [load, autoStartPoll]);

  const consultation = (data?.consultation ?? null) as EnrichedConsultation | null;

  const clock: ConsultationClock | null = consultation
    ? (() => {
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

export { playNotificationSound };
