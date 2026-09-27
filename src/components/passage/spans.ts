const norm = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').toLowerCase();

/** Character range of `span` inside `text` (quote/dash/case-insensitive), or null. */
export function findSpan(text: string, span: string): [number, number] | null {
  if (!span) return null;
  const t = norm(text);
  const s = norm(span.trim());
  const idx = t.indexOf(s);
  if (idx >= 0) return [idx, idx + s.length];
  // tolerate collapsed whitespace differences
  const compact = s.replace(/\s+/g, ' ');
  const idx2 = t.replace(/\s+/g, ' ').indexOf(compact);
  return idx2 >= 0 ? [idx2, idx2 + compact.length] : null;
}

/** The sentence containing `word`, for vocabulary context. */
export function sentenceAround(text: string, word: string): string {
  const idx = norm(text).indexOf(norm(word));
  if (idx < 0) return '';
  const before = text.slice(0, idx);
  const start = Math.max(before.lastIndexOf('. '), before.lastIndexOf('? '), before.lastIndexOf('! ')) + 1;
  const afterIdx = text.slice(idx).search(/[.?!](\s|$)/);
  const end = afterIdx < 0 ? text.length : idx + afterIdx + 1;
  return text.slice(start, end).trim();
}
