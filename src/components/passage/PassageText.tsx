import type { MouseEvent } from 'react';
import type { Schemas } from '../../api/client';
import { findSpan, sentenceAround } from './spans';

type Passage = Schemas['ReadingPassage'];

export type Highlight = { text: string; location?: string };

/**
 * Renders a reading passage. `highlight` marks a justification span (review mode); double-clicking a word calls
 * `onFlagWord` with the word and its sentence (adds it to the vocabulary deck).
 */
export function PassageText({
  passage,
  highlight,
  onFlagWord,
}: {
  passage: Passage;
  highlight?: Highlight | null;
  onFlagWord?: (word: string, sentence: string) => void;
}) {
  function onDoubleClick(e: MouseEvent<HTMLDivElement>, paragraph: string) {
    if (!onFlagWord) return;
    const word = window
      .getSelection()
      ?.toString()
      .trim()
      .replace(/[^\p{L}'-]/gu, '');
    if (word && word.length > 1 && word.length < 40) {
      e.preventDefault();
      onFlagWord(word.toLowerCase(), sentenceAround(paragraph, word));
    }
  }

  return (
    <article className="passage">
      <h2>{passage.title}</h2>
      {passage.paragraphs.map((p) => {
        const span =
          highlight && (!highlight.location || highlight.location === p.label)
            ? findSpan(p.text, highlight.text)
            : null;
        return (
          <div
            className="para"
            key={p.label}
            id={`para-${p.label}`}
            onDoubleClick={(e) => onDoubleClick(e, p.text)}
          >
            <span className="para-label">{p.label}</span>
            <p style={{ margin: 0 }}>
              {span ? (
                <>
                  {p.text.slice(0, span[0])}
                  <mark className="justify" id="evidence">
                    {p.text.slice(span[0], span[1])}
                  </mark>
                  {p.text.slice(span[1])}
                </>
              ) : (
                p.text
              )}
            </p>
          </div>
        );
      })}
    </article>
  );
}
