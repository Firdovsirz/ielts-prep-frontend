/**
 * IELTS-style word count for the Writing editor: whitespace-separated tokens, where a hyphenated word counts once and
 * standalone punctuation (e.g. "–" or "…") does not count.
 */
export function countWords(text: string): number {
  const tokens = text.trim().split(/\s+/);
  return tokens.filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

export type WordTarget = { min: number; status: 'under' | 'ok' | 'long' };

export function wordStatus(count: number, min: number): WordTarget['status'] {
  if (count < min) return 'under';
  if (count > min * 1.8) return 'long';
  return 'ok';
}
