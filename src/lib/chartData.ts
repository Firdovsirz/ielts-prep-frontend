export type Series = { name: string; values: number[] };

export const SERIES_COLORS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
  'var(--series-6)',
];

/** Fixed-order categorical colour; indices past the palette fall back to the last slot. */
export function seriesColor(index: number): string {
  return SERIES_COLORS[Math.min(index, SERIES_COLORS.length - 1)]!;
}

/** One row per category with a key per series — the shape Recharts line/bar charts expect. */
export function toCategoryRows(categories: string[], series: Series[]): Record<string, string | number>[] {
  return categories.map((category, i) => {
    const row: Record<string, string | number> = { category };
    series.forEach((s) => {
      const v = s.values[i];
      if (v != null) row[s.name] = v;
    });
    return row;
  });
}

export type Slice = { name: string; value: number; share: number };

/** Pie slices for one series; percentages are computed from the values (they need not sum to exactly 100). */
export function toPieSlices(categories: string[], series: Series): Slice[] {
  const total = series.values.reduce((a, b) => a + b, 0);
  return categories.map((name, i) => {
    const value = series.values[i] ?? 0;
    return { name, value, share: total > 0 ? Math.round((value / total) * 1000) / 10 : 0 };
  });
}

/** Trailing moving average over up to `window` previous points (inclusive); null where no data. */
export function rollingAverage(values: number[], window = 7): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 100) / 100;
  });
}

export type BandPoint = { at: string; band: number };

/** Chronological band points with attempt number and 7-attempt rolling average, for the progress charts. */
export function bandTimeline(points: BandPoint[], window = 7) {
  const sorted = [...points].sort((a, b) => a.at.localeCompare(b.at));
  const avg = rollingAverage(
    sorted.map((p) => p.band),
    window,
  );
  return sorted.map((p, i) => ({ attempt: i + 1, at: p.at, band: p.band, avg: avg[i]! }));
}

/** Nice y-axis bounds for band charts (IELTS bands 0–9, padded to whole bands). */
export function bandDomain(values: number[]): [number, number] {
  if (values.length === 0) return [4, 9];
  const min = Math.max(0, Math.floor(Math.min(...values)) - 1);
  const max = Math.min(9, Math.ceil(Math.max(...values)) + 1);
  return [min, Math.max(max, min + 2)];
}

/** Accuracy 0–1 → one of five sequential steps (heatmap cell colour). */
export function heatStep(accuracy: number | null): string {
  if (accuracy == null) return 'var(--surface-2)';
  const steps = ['var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)'];
  return steps[Math.min(4, Math.max(0, Math.floor(accuracy * 5 - 1e-9)))]!;
}
