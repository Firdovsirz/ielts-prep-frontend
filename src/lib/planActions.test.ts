import { describe, expect, it } from 'vitest';
import { asModule, shortDate, taskRoute, weekdayLabel } from './planActions';

describe('plan actions', () => {
  it('routes navigation-only tasks', () => {
    expect(taskRoute('GRAMMAR_AREA', 'articles')).toBe('/grammar/area/articles');
    expect(taskRoute('VOCAB_REVIEW', null)).toBe('/vocabulary');
    expect(taskRoute('MOCK_TEST', null)).toBe('/mock');
    expect(taskRoute('READING_PASSAGE', '3')).toBeNull();
  });

  it('maps modules and formats dates', () => {
    expect(asModule('WRITING')).toBe('WRITING');
    expect(asModule('MOCK')).toBeNull();
    expect(weekdayLabel('2026-10-03', false)).toBe('Saturday');
    expect(weekdayLabel('2026-10-03', true)).toBe('Today');
    expect(shortDate('2026-10-27')).toBe('27 Oct');
  });
});

describe('greeting', () => {
  it('follows the time of day', async () => {
    const { greeting } = await import('./dates');
    expect(greeting(new Date(2026, 9, 1, 2))).toBe('Good evening');
    expect(greeting(new Date(2026, 9, 1, 9))).toBe('Good morning');
    expect(greeting(new Date(2026, 9, 1, 14))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 9, 1, 21))).toBe('Good evening');
  });
});
