import { useEffect, useState } from "react";

/**
 * Trails `value` by `delay` ms. Used for search boxes that hit the API, so
 * typing a name fires one request instead of one per keystroke.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
