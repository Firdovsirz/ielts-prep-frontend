import { useEffect, useState } from 'react';

/**
 * Seconds remaining for a timed section, derived from the server start time so a reload doesn't reset the clock.
 * Returns negative values once time is up (practice mode shows overtime).
 */
export function remainingSeconds(startedAt: string | number, limitSeconds: number, now: number): number {
  const start = typeof startedAt === 'number' ? startedAt : Date.parse(startedAt);
  return limitSeconds - Math.floor((now - start) / 1000);
}

export function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, active]);
  return now;
}

export function useCountdown(startedAt: string | number | null, limitSeconds: number | null, active = true) {
  const now = useNow(1000, active && startedAt != null && limitSeconds != null);
  if (startedAt == null || limitSeconds == null) return { remaining: null, elapsed: 0, expired: false };
  const remaining = remainingSeconds(startedAt, limitSeconds, now);
  return { remaining, elapsed: limitSeconds - remaining, expired: remaining <= 0 };
}
