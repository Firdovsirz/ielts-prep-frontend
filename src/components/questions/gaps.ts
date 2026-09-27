/** Splits text containing gap markers ({{7}}) into plain strings and gap objects. */
export function splitGaps(text: string): (string | { gap: number })[] {
  const parts: (string | { gap: number })[] = [];
  const re = /\{\{(\d+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ gap: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/**
 * Rewrites question ranges in a rubric ("Questions 1–5", "boxes 1-5", "Questions 12 and 13") when a passage/section
 * is part of a longer test whose numbering is offset.
 */
export function offsetInstructions(text: string, offset: number): string {
  if (offset === 0) return text;
  return text.replace(
    /\b(Questions?|boxes|questions?)(\s+)(\d+)(?:(\s*(?:–|-|—|and|to)\s*)(\d+))?/g,
    (_m, word: string, space: string, a: string, sep?: string, b?: string) =>
      `${word}${space}${Number(a) + offset}${sep && b ? `${sep}${Number(b) + offset}` : ''}`,
  );
}
