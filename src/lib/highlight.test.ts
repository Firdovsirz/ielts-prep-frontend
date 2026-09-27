import { highlightSegments } from './highlight';

describe('highlightSegments', () => {
  const text = 'This have many benefit and this have costs.';

  it('marks the first non-overlapping occurrence of each excerpt', () => {
    const segs = highlightSegments(text, [
      { original: 'this have', id: 0 },
      { original: 'this have', id: 1 },
    ]);
    const marked = segs.filter((s) => s.mark != null);
    expect(marked.map((s) => s.text)).toEqual(['This have', 'this have']);
    expect(segs.map((s) => s.text).join('')).toBe(text);
  });

  it('skips excerpts that are not in the text', () => {
    expect(highlightSegments(text, [{ original: 'nowhere', id: 0 }])).toEqual([{ text }]);
  });
});
