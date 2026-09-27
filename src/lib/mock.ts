export const PAPER_NAMES: Record<string, string> = {
  LISTENING: 'Listening',
  READING: 'Reading',
  WRITING: 'Writing',
  SPEAKING: 'Speaking',
};

/** Rules shown before each paper. Listening's checking time comes from Settings (2 min computer, 10 min paper). */
export function paperRules(module: string, minutes: number): string[] {
  if (module === 'LISTENING') {
    const check = Math.max(0, minutes - 30);
    return [
      'Four recordings, 40 questions. Each recording is played once only.',
      `You get time to read the questions before each part, then ${check} minutes at the end to check and transfer your answers.`,
      'Spelling counts, and answers over the word limit are marked wrong.',
    ];
  }
  return PAPER_RULES[module] ?? [];
}

const PAPER_RULES: Record<string, string[]> = {
  READING: [
    'Three passages of increasing difficulty, 40 questions, 60 minutes.',
    'There is no extra time to transfer answers — the timer includes everything.',
    'Aim for about 20 minutes per passage; do not get stuck on one question.',
  ],
  WRITING: [
    'Task 1 (at least 150 words, ~20 minutes) and Task 2 (at least 250 words, ~40 minutes). 60 minutes in total.',
    'Task 2 carries twice the weight of Task 1.',
    'Both tasks are graded against the four public band descriptors.',
  ],
  SPEAKING: [
    'Part 1 interview (4–5 min), Part 2 long turn (1 min to prepare, up to 2 min to speak), Part 3 discussion (4–5 min).',
    'Your answers are recorded and transcribed; pronunciation cannot be judged from a transcript and is not scored.',
    'In the real test Speaking may be on another day — a short break now is fine.',
  ],
};

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  if (seconds < 60) return seconds > 0 ? '<1 min' : '—';
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
