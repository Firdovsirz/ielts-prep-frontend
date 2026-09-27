import { tokens } from '../lib/vocab';

/** Renders text whose words can be clicked to add them to the vocabulary deck. */
export function PickableText({
  text,
  picked,
  onPick,
}: {
  text: string;
  picked: Set<string>;
  onPick: (word: string, sentence: string) => void;
}) {
  return (
    <>
      {tokens(text).map((t, i) =>
        t.word ? (
          <span
            key={i}
            role="button"
            tabIndex={0}
            className={`pick-word${picked.has(t.text.toLowerCase()) ? ' picked' : ''}`}
            onClick={() => onPick(t.text, text)}
            onKeyDown={(e) => e.key === 'Enter' && onPick(t.text, text)}
          >
            {t.text}
          </span>
        ) : (
          t.text
        ),
      )}
    </>
  );
}
