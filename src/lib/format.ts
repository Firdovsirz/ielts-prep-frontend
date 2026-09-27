export function formatClock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const s = Math.abs(Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${sign}${h}:${mm}:${ss}` : `${sign}${mm}:${ss}`;
}

export function formatMinutes(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const m = Math.round(seconds / 60);
  return m < 1 ? `${Math.round(seconds)} s` : `${m} min`;
}

export function formatBand(band: number | null | undefined): string {
  if (band == null || Number.isNaN(band)) return '—';
  return band.toFixed(1);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatUsd(v: number | null | undefined): string {
  if (v == null) return '—';
  return `$${v.toFixed(v < 1 ? 3 : 2)}`;
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}
