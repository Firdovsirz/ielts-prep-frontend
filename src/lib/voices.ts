/** Accent → preferred BCP-47 languages (first match wins). */
export const ACCENT_LANGS: Record<string, string[]> = {
  british: ['en-GB'],
  scottish: ['en-GB'],
  irish: ['en-IE', 'en-GB'],
  australian: ['en-AU', 'en-GB'],
  new_zealand: ['en-NZ', 'en-AU', 'en-GB'],
  american: ['en-US'],
  canadian: ['en-CA', 'en-US'],
};

const FEMALE =
  /(female|woman|samantha|karen|moira|tessa|serena|kate|fiona|victoria|allison|ava|susan|veena|zira|hazel|libby|sonia|natasha|catherine|martha|emma|amy|olivia|joanna|salli|kimberly|ivy|kendra|nicole|aria|jenny|michelle|sara|clara|emily|isla|maisie|lily|shelley|flo|sandy|grandma)/i;
const MALE =
  /(male|man|daniel|alex|oliver|tom|fred|aaron|arthur|gordon|lee|rishi|george|david|mark|ryan|thomas|brian|russell|matthew|joey|justin|kevin|guy|eric|christopher|liam|william|james|ralph|reed|rocko|eddy|grandpa)/i;

export type VoiceLike = { name: string; lang: string; voiceURI?: string };
export type Speaker = { id: string; gender: string; accent: string };
export type VoicePlan = { voice: VoiceLike | null; pitch: number; lang: string };

const norm = (lang: string) => lang.replace('_', '-').toLowerCase();

function genderOf(v: VoiceLike): 'female' | 'male' | null {
  if (MALE.test(v.name) && !/female/i.test(v.name)) return 'male';
  if (FEMALE.test(v.name)) return 'female';
  return null;
}

/**
 * Picks a distinct voice per speaker: matching accent first, then gender hints in the voice name, avoiding reuse.
 * When voices must be shared, pitch separates the speakers.
 */
export function assignVoices(speakers: Speaker[], voices: VoiceLike[]): Record<string, VoicePlan> {
  const english = voices.filter((v) => norm(v.lang).startsWith('en'));
  const used = new Set<string>();
  const plan: Record<string, VoicePlan> = {};
  speakers.forEach((s, index) => {
    const langs = (ACCENT_LANGS[s.accent] ?? ['en-GB']).map(norm);
    const score = (v: VoiceLike) => {
      const langRank = langs.indexOf(norm(v.lang));
      let points = langRank >= 0 ? 100 - langRank * 10 : 0;
      const g = genderOf(v);
      if (g === s.gender) points += 30;
      else if (g !== null) points -= 20;
      if (used.has(v.name)) points -= 60;
      return points;
    };
    const best = [...english].sort((a, b) => score(b) - score(a))[0] ?? null;
    const reused = best ? used.has(best.name) : false;
    if (best) used.add(best.name);
    const basePitch = s.gender === 'female' ? 1.08 : 0.92;
    plan[s.id] = {
      voice: best,
      pitch: reused ? basePitch + (index % 2 === 0 ? 0.12 : -0.12) : basePitch,
      lang: best?.lang ?? langs[0]!,
    };
  });
  return plan;
}

/** Narrator (examiner) voice: British English if available. */
export function narratorVoice(voices: VoiceLike[]): VoiceLike | null {
  return (
    voices.find((v) => norm(v.lang) === 'en-gb') ?? voices.find((v) => norm(v.lang).startsWith('en')) ?? null
  );
}

/** Splits a long line into sentence chunks (some browsers cut utterances after ~15 s). */
export function chunks(text: string, max = 220): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
