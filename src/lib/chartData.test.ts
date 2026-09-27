import {
  bandDomain,
  bandTimeline,
  heatStep,
  rollingAverage,
  seriesColor,
  toCategoryRows,
  toPieSlices,
} from './chartData';

describe('chart data transforms', () => {
  it('pivots series into one row per category', () => {
    const rows = toCategoryRows(
      ['2000', '2010'],
      [
        { name: 'Coal', values: [40, 30] },
        { name: 'Gas', values: [20, 35] },
      ],
    );
    expect(rows).toEqual([
      { category: '2000', Coal: 40, Gas: 20 },
      { category: '2010', Coal: 30, Gas: 35 },
    ]);
  });

  it('computes pie percentages from the values', () => {
    const slices = toPieSlices(['A', 'B', 'C'], { name: '2020', values: [50, 30, 20] });
    expect(slices.map((s) => s.share)).toEqual([50, 30, 20]);
    expect(toPieSlices(['A'], { name: 'x', values: [0] })[0]!.share).toBe(0);
  });

  it('computes a trailing rolling average', () => {
    expect(rollingAverage([6, 7, 8], 2)).toEqual([6, 6.5, 7.5]);
    expect(rollingAverage([6, 6.5, 7, 7.5, 8, 8.5, 9, 9], 7)[7]).toBeCloseTo(7.93, 2);
  });

  it('builds a chronological band timeline with a 7-attempt average', () => {
    const t = bandTimeline([
      { at: '2026-10-03', band: 7 },
      { at: '2026-10-01', band: 6 },
      { at: '2026-10-02', band: 6.5 },
    ]);
    expect(t.map((p) => p.band)).toEqual([6, 6.5, 7]);
    expect(t.map((p) => p.attempt)).toEqual([1, 2, 3]);
    expect(t[2]!.avg).toBe(6.5);
  });

  it('pads band axes to whole bands inside 0–9', () => {
    expect(bandDomain([6.5, 7])).toEqual([5, 8]);
    expect(bandDomain([8.5, 9])).toEqual([7, 9]);
    expect(bandDomain([])).toEqual([4, 9]);
  });

  it('keeps categorical colours in fixed order', () => {
    expect(seriesColor(0)).toBe('var(--series-1)');
    expect(seriesColor(9)).toBe('var(--series-6)');
  });

  it('maps accuracy to five sequential steps', () => {
    expect(heatStep(null)).toBe('var(--surface-2)');
    expect(heatStep(0)).toBe('var(--seq-1)');
    expect(heatStep(1)).toBe('var(--seq-5)');
    expect(heatStep(0.55)).toBe('var(--seq-3)');
  });
});
