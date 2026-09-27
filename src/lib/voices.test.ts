import { assignVoices, chunks, narratorVoice } from './voices';

const VOICES = [
  { name: 'Daniel', lang: 'en-GB' },
  { name: 'Kate', lang: 'en-GB' },
  { name: 'Karen', lang: 'en-AU' },
  { name: 'Lee', lang: 'en-AU' },
  { name: 'Samantha', lang: 'en-US' },
  { name: 'Alex', lang: 'en-US' },
  { name: 'Thomas', lang: 'fr-FR' },
];

describe('assignVoices', () => {
  it('matches accent and gender', () => {
    const plan = assignVoices(
      [
        { id: 'S1', gender: 'female', accent: 'australian' },
        { id: 'S2', gender: 'male', accent: 'british' },
      ],
      VOICES,
    );
    expect(plan.S1!.voice!.name).toBe('Karen');
    expect(plan.S2!.voice!.name).toBe('Daniel');
  });

  it('gives different speakers different voices when possible', () => {
    const plan = assignVoices(
      [
        { id: 'S1', gender: 'male', accent: 'british' },
        { id: 'S2', gender: 'male', accent: 'british' },
      ],
      VOICES,
    );
    expect(plan.S1!.voice!.name).not.toBe(plan.S2!.voice!.name);
  });

  it('separates speakers by pitch when only one voice exists', () => {
    const plan = assignVoices(
      [
        { id: 'S1', gender: 'female', accent: 'british' },
        { id: 'S2', gender: 'female', accent: 'british' },
      ],
      [{ name: 'Only', lang: 'en-GB' }],
    );
    expect(plan.S1!.pitch).not.toBe(plan.S2!.pitch);
  });

  it('never picks non-English voices and survives no voices at all', () => {
    const plan = assignVoices(
      [{ id: 'S1', gender: 'male', accent: 'scottish' }],
      [{ name: 'Thomas', lang: 'fr-FR' }],
    );
    expect(plan.S1!.voice).toBeNull();
    expect(plan.S1!.lang).toBe('en-gb');
  });
});

describe('narrator and chunking', () => {
  it('prefers a British narrator', () => {
    expect(narratorVoice(VOICES)!.lang).toBe('en-GB');
  });

  it('splits long lines at sentence boundaries', () => {
    const text = 'First sentence here. '.repeat(20);
    const parts = chunks(text, 100);
    expect(parts.length).toBeGreaterThan(3);
    expect(parts.every((p) => p.length <= 110)).toBe(true);
    expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(text.trim().replace(/\s+/g, ' '));
  });
});
