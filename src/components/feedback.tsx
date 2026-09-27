import { useMemo } from 'react';
import type { Schemas } from '../api/client';
import { highlightSegments, type Mark } from '../lib/highlight';
import { criterionName } from '../lib/criteria';
import { titleCase } from '../lib/format';

type Criterion = Schemas['CriterionBand'];
type TaggedError = Schemas['TaggedError'];

export function CriteriaGrid({
  criteria,
  notAssessable,
}: {
  criteria: Criterion[];
  notAssessable?: string[];
}) {
  return (
    <div className="criteria-grid">
      {criteria.map((c) => {
        const na = notAssessable?.includes(c.criterion);
        return (
          <div key={c.criterion} className="card criterion-card">
            <div className="row-between">
              <span className="criterion-name">{criterionName(c.criterion)}</span>
              <span className={`criterion-band${na ? ' na' : ''}`}>{na ? 'n/a' : c.band}</span>
            </div>
            <div className="band-meter">
              <div style={{ width: `${na ? 0 : (c.band / 9) * 100}%` }} />
            </div>
            <p className="small" style={{ marginTop: '0.6rem' }}>
              {na
                ? 'Not assessable from a transcript — record audio with an audio-analysis service to include it.'
                : c.justification}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function FeedbackList({ items, numbered }: { items: string[]; numbered?: boolean }) {
  const Tag = numbered ? 'ol' : 'ul';
  return (
    <Tag className="feedback-list">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </Tag>
  );
}

export function ErrorList({ errors, onFocus }: { errors: TaggedError[]; onFocus?: (i: number) => void }) {
  if (errors.length === 0) return <p className="muted small">No errors tagged — impressive.</p>;
  return (
    <ul className="list-plain error-list">
      {errors.map((e, i) => (
        <li key={i} onMouseEnter={() => onFocus?.(i)} onMouseLeave={() => onFocus?.(-1)}>
          <div className="row" style={{ gap: '0.4rem' }}>
            <span className={`badge type-${e.type}`}>{e.type}</span>
            <span className="small muted">{titleCase(e.subtype)}</span>
          </div>
          <div>
            <span className="strike">{e.original}</span> → <strong>{e.correction}</strong>
          </div>
          <div className="small muted">{e.explanation}</div>
        </li>
      ))}
    </ul>
  );
}

export function HighlightedText({
  text,
  marks,
  focus,
  errors,
}: {
  text: string;
  marks: Mark[];
  focus: number | null;
  errors: TaggedError[];
}) {
  const segments = useMemo(() => highlightSegments(text, marks), [text, marks]);
  return (
    <div className="essay">
      {segments.map((s, i) =>
        s.mark == null ? (
          <span key={i}>{s.text}</span>
        ) : (
          <mark
            key={i}
            className={`error-mark type-${errors[s.mark]?.type ?? 'grammar'}${focus === s.mark ? ' focused' : ''}`}
            title={`${errors[s.mark]?.correction ?? ''} — ${errors[s.mark]?.explanation ?? ''}`}
          >
            {s.text}
          </mark>
        ),
      )}
    </div>
  );
}
