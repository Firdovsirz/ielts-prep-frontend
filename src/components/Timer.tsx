import { formatClock } from '../lib/format';

/** Countdown display; turns amber in the last 5 minutes and red at the end (practice mode shows overtime). */
export function Timer({ remaining, label }: { remaining: number | null; label?: string }) {
  if (remaining == null) return null;
  const cls = remaining <= 0 ? 'danger' : remaining <= 300 ? 'warning' : '';
  return (
    <span className={`timer ${cls}`} aria-live="off" title={label ?? 'Time remaining'}>
      {remaining < 0 ? '+' + formatClock(-remaining) : formatClock(remaining)}
    </span>
  );
}
