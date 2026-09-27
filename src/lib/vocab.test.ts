import { describe, expect, it } from 'vitest';
import { emphasise, relativeDue, strength, tokens } from './vocab';

const NOW = Date.parse('2026-10-01T09:00:00Z');

describe('relativeDue', () => {
  it('formats future and past due times', () => {
    expect(relativeDue('2026-10-01T09:00:30Z', NOW)).toBe('now');
    expect(relativeDue('2026-10-01T09:10:00Z', NOW)).toBe('in 10 min');
    expect(relativeDue('2026-10-01T14:00:00Z', NOW)).toBe('in 5 h');
    expect(relativeDue('2026-10-07T09:00:00Z', NOW)).toBe('in 6 d');
    expect(relativeDue('2027-01-01T09:00:00Z', NOW)).toBe('in 3 mo');
    expect(relativeDue('2026-09-20T09:00:00Z', NOW)).toBe('overdue');
    expect(relativeDue(null, NOW)).toBe('—');
  });
});

describe('emphasise', () => {
  it('marks the headword and its inflections', () => {
    const segs = emphasise('Researchers analysed the data before analysing it again.', 'analyse');
    expect(segs.filter((s) => s.hit).map((s) => s.text)).toEqual(['analysed', 'analysing']);
    expect(segs.map((s) => s.text).join('')).toBe('Researchers analysed the data before analysing it again.');
  });

  it('leaves unrelated sentences untouched', () => {
    expect(emphasise('Nothing here.', 'mitigate')).toEqual([{ text: 'Nothing here.', hit: false }]);
  });
});

describe('strength and tokens', () => {
  it('grades card maturity', () => {
    expect(strength(0, 0)).toBe(0);
    expect(strength(1, 1)).toBe(1);
    expect(strength(6, 2)).toBe(2);
    expect(strength(40, 5)).toBe(4);
  });

  it('splits text into clickable words, keeping punctuation', () => {
    const t = tokens("It's a well-known fact, isn't it?");
    expect(t.filter((x) => x.word).map((x) => x.text)).toEqual([
      "It's",
      'a',
      'well-known',
      'fact',
      "isn't",
      'it',
    ]);
    expect(t.map((x) => x.text).join('')).toBe("It's a well-known fact, isn't it?");
  });
});
