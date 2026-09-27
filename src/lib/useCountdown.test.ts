import { act, renderHook } from '@testing-library/react';
import { remainingSeconds, useCountdown } from './useCountdown';

describe('remainingSeconds', () => {
  it('derives remaining time from the server start time', () => {
    const start = Date.parse('2026-10-01T10:00:00Z');
    expect(remainingSeconds(start, 3600, start + 90_000)).toBe(3510);
  });
  it('goes negative after the limit (practice overtime)', () => {
    const start = Date.parse('2026-10-01T10:00:00Z');
    expect(remainingSeconds('2026-10-01T10:00:00Z', 60, start + 75_000)).toBe(-15);
  });
});

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ticks every second and reports expiry', () => {
    vi.setSystemTime(new Date('2026-10-01T10:00:00Z'));
    const { result } = renderHook(() => useCountdown('2026-10-01T10:00:00Z', 3, true));
    expect(result.current.remaining).toBe(3);
    expect(result.current.expired).toBe(false);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.remaining).toBe(0);
    expect(result.current.expired).toBe(true);
  });

  it('is inert without a limit', () => {
    const { result } = renderHook(() => useCountdown(null, null));
    expect(result.current.remaining).toBeNull();
  });
});
