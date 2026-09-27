export type GradeKey = 'again' | 'hard' | 'good' | 'easy';

/** The four review buttons and the SM-2 grade each one sends (see backend Sm2). */
export const GRADES: { key: GradeKey; label: string; grade: number; tone: string }[] = [
  { key: 'again', label: 'Again', grade: 1, tone: 'bad' },
  { key: 'hard', label: 'Hard', grade: 3, tone: 'warn' },
  { key: 'good', label: 'Good', grade: 4, tone: 'good' },
  { key: 'easy', label: 'Easy', grade: 5, tone: 'easy' },
];

/** "now", "in 25 min", "in 5 h", "in 3 d", "in 2 mo" — or "overdue". */
export function relativeDue(iso: string | null | undefined, now: number): string {
  if (!iso) return '—';
  const ms = new Date(iso).getTime() - now;
  if (ms <= 60_000) return ms < -86_400_000 ? 'overdue' : 'now';
  const min = Math.round(ms / 60_000);
  if (min < 60) return `in ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `in ${h} h`;
  const d = Math.round(h / 24);
  return d < 45 ? `in ${d} d` : `in ${Math.round(d / 30)} mo`;
}

export type Segment = { text: string; hit: boolean };

/** Splits a sentence so the headword (and its inflections: analyse → analysed, analysing) can be emphasised. */
export function emphasise(sentence: string, word: string): Segment[] {
  const w = word.trim();
  if (!w) return [{ text: sentence, hit: false }];
  const stem = w.length > 4 ? w.replace(/(e|y)$/i, '') : w;
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b(${escaped}[a-z]*)`, 'gi');
  const out: Segment[] = [];
  let last = 0;
  for (const m of sentence.matchAll(re)) {
    if (m.index > last) out.push({ text: sentence.slice(last, m.index), hit: false });
    out.push({ text: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < sentence.length) out.push({ text: sentence.slice(last), hit: false });
  return out;
}

/** Card strength for the deck table: 0 (new) … 4 (mature, 21+ days). */
export function strength(intervalDays: number, repetitions: number): number {
  if (repetitions === 0) return 0;
  if (intervalDays < 3) return 1;
  if (intervalDays < 10) return 2;
  if (intervalDays < 21) return 3;
  return 4;
}

/** Tokenises text into words (clickable) and the separators between them. */
export function tokens(text: string): { text: string; word: boolean }[] {
  return text
    .split(/([A-Za-z][A-Za-z'-]*[A-Za-z]|[A-Za-z])/)
    .filter(Boolean)
    .map((t) => ({
      text: t,
      word: /^[A-Za-z]/.test(t),
    }));
}

export function pronounce(word: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-GB';
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith('en-GB'));
  if (voice) u.voice = voice;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}
