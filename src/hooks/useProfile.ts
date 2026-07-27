import { useCallback, useEffect, useState } from "react";
import { profileService, type ProfileUpdate, type UserProfile } from "@/services/profile";

type Status = "idle" | "loading" | "saving" | "saved" | "error";

/**
 * Loads the signed-in user's profile and persists edits through the API.
 * Replaces the old fake `setSaved(true)` handlers that discarded input.
 */
export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    profileService
      .get()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setStatus("idle");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load profile.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (changes: ProfileUpdate) => {
    setStatus("saving");
    setError(null);
    try {
      const updated = await profileService.update(changes);
      setProfile(updated);
      setStatus("saved");
      window.setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2500);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
      setStatus("error");
      return false;
    }
  }, []);

  return { profile, status, error, save, isLoading: status === "loading" };
}
