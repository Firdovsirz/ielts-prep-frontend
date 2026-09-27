import { countWords, wordStatus } from './wordCount';

describe('countWords', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('The graph shows three trends.')).toBe(5);
  });
  it('treats hyphenated words and numbers as one word', () => {
    expect(countWords('A well-known fact: 1,500 people moved in 2019.')).toBe(8);
  });
  it('ignores stray punctuation and extra whitespace', () => {
    expect(countWords('  Firstly , – the rate rose …  ')).toBe(4);
  });
  it('returns 0 for empty text', () => {
    expect(countWords('   \n ')).toBe(0);
  });
});

describe('wordStatus', () => {
  it('flags responses under the minimum', () => {
    expect(wordStatus(149, 150)).toBe('under');
    expect(wordStatus(150, 150)).toBe('ok');
    expect(wordStatus(480, 250)).toBe('long');
  });
});
