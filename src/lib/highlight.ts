export type Mark = { original: string; id: number };
export type Segment = { text: string; mark?: number };

/**
 * Splits `text` into segments, marking the first non-overlapping occurrence of each error's original excerpt
 * (exact match first, then case-insensitive). Unfound excerpts are skipped.
 */
export function highlightSegments(text: string, marks: Mark[]): Segment[] {
  const ranges: { start: number; end: number; id: number }[] = [];
  const lower = text.toLowerCase();
  for (const m of marks) {
    const needle = m.original.trim();
    if (!needle) continue;
    // every case-insensitive occurrence, exact-case matches first, then by position
    const candidates: number[] = [];
    for (
      let i = lower.indexOf(needle.toLowerCase());
      i >= 0;
      i = lower.indexOf(needle.toLowerCase(), i + 1)
    ) {
      candidates.push(i);
    }
    candidates.sort(
      (a, b) => Number(text.startsWith(needle, b)) - Number(text.startsWith(needle, a)) || a - b,
    );
    const found = candidates.find((idx) => !ranges.some((r) => idx < r.end && idx + needle.length > r.start));
    if (found !== undefined) ranges.push({ start: found, end: found + needle.length, id: m.id });
  }
  ranges.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start > pos) out.push({ text: text.slice(pos, r.start) });
    out.push({ text: text.slice(r.start, r.end), mark: r.id });
    pos = r.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}
