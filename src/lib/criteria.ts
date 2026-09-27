import { titleCase } from './format';

const CRITERION_NAMES: Record<string, string> = {
  TASK_ACHIEVEMENT: 'Task Achievement',
  TASK_RESPONSE: 'Task Response',
  COHERENCE_COHESION: 'Coherence & Cohesion',
  LEXICAL_RESOURCE: 'Lexical Resource',
  GRAMMATICAL_RANGE_ACCURACY: 'Grammatical Range & Accuracy',
  FLUENCY_COHERENCE: 'Fluency & Coherence',
  PRONUNCIATION: 'Pronunciation',
};

export function criterionName(key: string): string {
  return CRITERION_NAMES[key] ?? titleCase(key);
}
