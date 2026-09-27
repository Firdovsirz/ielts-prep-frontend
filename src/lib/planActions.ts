import type { ModuleName } from '../components/icons';

/** Button label per plan action; actions without a label have nothing to start. */
export const CTA: Record<string, string> = {
  READING_PASSAGE: 'Start',
  READING_TEST: 'Start test',
  LISTENING_SECTION: 'Start',
  LISTENING_TEST: 'Start test',
  WRITING_TASK1: 'Start',
  WRITING_TASK2: 'Start',
  WRITING_TEST: 'Start test',
  SPEAKING_PART: 'Start',
  SPEAKING_TEST: 'Start test',
  GRAMMAR_DIAGNOSTIC: 'Start',
  GRAMMAR_AREA: 'Open',
  GRAMMAR_ERRORS: 'Drill',
  VOCAB_REVIEW: 'Review',
  MOCK_TEST: 'Open',
  REVIEW_MISTAKES: 'Open',
};

const MODULES: ModuleName[] = ['LISTENING', 'READING', 'WRITING', 'SPEAKING', 'GRAMMAR', 'VOCAB'];

export function asModule(module: string): ModuleName | null {
  return (MODULES as string[]).includes(module) ? (module as ModuleName) : null;
}

/** Pages that plan tasks open directly (no session needs creating first). */
export function taskRoute(action: string, variant: string | null): string | null {
  switch (action) {
    case 'GRAMMAR_AREA':
      return variant ? `/grammar/area/${variant}` : '/grammar';
    case 'VOCAB_REVIEW':
      return '/vocabulary';
    case 'MOCK_TEST':
      return '/mock';
    case 'REVIEW_MISTAKES':
      return '/history';
    default:
      return null;
  }
}

export const PHASES = [
  { key: 'BUILD', label: 'Build', hint: 'Accuracy on single passages, parts and tasks' },
  { key: 'SHARPEN', label: 'Sharpen', hint: 'Timed full papers in exam mode' },
  { key: 'EXAM_WEEK', label: 'Exam week', hint: 'Dress rehearsal, then taper and rest' },
];

export function weekdayLabel(iso: string, today: boolean): string {
  if (today) return 'Today';
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-GB', { weekday: 'long' });
}

export function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
