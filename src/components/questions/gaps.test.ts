import { offsetInstructions, splitGaps } from './gaps';

describe('gap helpers', () => {
  it('splits text around {{n}} gaps', () => {
    expect(splitGaps('Price: ${{7}} per {{8}}')).toEqual(['Price: $', { gap: 7 }, ' per ', { gap: 8 }]);
  });

  it('offsets rubric ranges for later passages', () => {
    expect(offsetInstructions('Questions 1–5\nIn boxes 1-5 on your answer sheet', 13)).toBe(
      'Questions 14–18\nIn boxes 14-18 on your answer sheet',
    );
    expect(offsetInstructions('Questions 12 and 13', 26)).toBe('Questions 38 and 39');
  });
});
