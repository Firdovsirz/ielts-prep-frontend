import { Fragment, type ReactNode } from 'react';
import type { Schemas } from '../../api/client';
import { MapFigure } from './MapFigure';
import { DiagramFigure } from './DiagramFigure';
import { offsetInstructions, splitGaps } from './gaps';

type Group = Schemas['QuestionGroup'];
type Question = Schemas['Question'];
type Result = Schemas['QuestionResult'];

export type QuestionGroupProps = {
  group: Group;
  /** Added to local question numbers for display (full tests number 1–40). */
  offset: number;
  answers: Record<number, string>;
  onAnswer?: (number: number, value: string) => void;
  /** Review mode: results keyed by displayed (global) number. */
  results?: Record<number, Result>;
  onShowEvidence?: (number: number) => void;
};

const TFNG = ['TRUE', 'FALSE', 'NOT GIVEN'];
const YNNG = ['YES', 'NO', 'NOT GIVEN'];
const DROPDOWN_TYPES = new Set([
  'MATCHING_INFORMATION',
  'MATCHING_HEADINGS',
  'MATCHING_FEATURES',
  'MATCHING_SENTENCE_ENDINGS',
  'MATCHING',
  'MAP_LABELLING',
]);
const CONTEXT_TYPES = new Set(['SUMMARY_COMPLETION', 'NOTE_COMPLETION', 'FORM_COMPLETION']);

export function QuestionGroupView(props: QuestionGroupProps) {
  const { group, offset } = props;
  const type = group.question_type;
  const hasWordBank =
    group.options.length > 0 && !DROPDOWN_TYPES.has(type) && type !== 'MULTIPLE_CHOICE_MULTI';
  const showOptionsBox =
    group.options.length > 0 && type !== 'MULTIPLE_CHOICE_MULTI' && type !== 'MAP_LABELLING';

  return (
    <section className="qgroup" id={`group-${offset}-${group.group_id}`}>
      <div className="qgroup-instructions">{offsetInstructions(group.instructions, offset)}</div>

      {showOptionsBox && (
        <div className="options-box">
          {group.options.map((o) => (
            <div className="opt" key={o.key}>
              <span className="opt-key">{o.key}</span>
              <span>{o.text}</span>
            </div>
          ))}
        </div>
      )}

      {type === 'MAP_LABELLING' && group.map.features.length > 0 && <MapFigure map={group.map} />}
      {type === 'DIAGRAM_LABEL_COMPLETION' && <DiagramFigure diagram={group.diagram} offset={offset} />}

      {CONTEXT_TYPES.has(type) && group.context && (
        <div className="context-text">
          <GapText text={group.context} {...props} wordBank={hasWordBank} />
        </div>
      )}

      {type === 'TABLE_COMPLETION' && <GapTable {...props} wordBank={hasWordBank} />}

      {type === 'FLOW_CHART_COMPLETION' && (
        <div className="flow">
          {group.flow_steps.map((step, i) => (
            <Fragment key={i}>
              {i > 0 && <div className="flow-arrow">↓</div>}
              <div className="flow-box">
                <GapText text={step} {...props} wordBank={hasWordBank} />
              </div>
            </Fragment>
          ))}
        </div>
      )}

      {type === 'MULTIPLE_CHOICE_MULTI' ? (
        <ChooseMany {...props} />
      ) : (
        group.questions.map((q) => <QuestionRow key={q.number} q={q} {...props} wordBank={hasWordBank} />)
      )}
    </section>
  );
}

function QuestionRow(props: QuestionGroupProps & { q: Question; wordBank: boolean }) {
  const { q, group, offset, answers, onAnswer, results } = props;
  const n = q.number + offset;
  const value = answers[n] ?? '';
  const result = results?.[n];
  const type = group.question_type;
  const readOnly = !onAnswer;
  const set = (v: string) => onAnswer?.(n, v);

  let body: ReactNode;
  if (type === 'TRUE_FALSE_NOT_GIVEN' || type === 'YES_NO_NOT_GIVEN') {
    const values = type === 'TRUE_FALSE_NOT_GIVEN' ? TFNG : YNNG;
    body = (
      <>
        <div>{q.prompt}</div>
        <div className="tfng" role="radiogroup" aria-label={`Question ${n}`}>
          {values.map((v) => (
            <button
              key={v}
              type="button"
              className={value === v ? 'selected' : ''}
              disabled={readOnly}
              onClick={() => set(value === v ? '' : v)}
            >
              {v}
            </button>
          ))}
        </div>
      </>
    );
  } else if (type === 'MULTIPLE_CHOICE') {
    body = (
      <>
        <div>{q.prompt}</div>
        <div className="choice-list" role="radiogroup">
          {q.options.map((o) => (
            <label key={o.key} className={`choice${value === o.key ? ' selected' : ''}`}>
              <input
                type="radio"
                name={`q${n}`}
                checked={value === o.key}
                disabled={readOnly}
                onChange={() => set(o.key)}
              />
              <span>
                <strong>{o.key}</strong> {o.text}
              </span>
            </label>
          ))}
        </div>
      </>
    );
  } else if (DROPDOWN_TYPES.has(type)) {
    body = (
      <div className="row">
        <span style={{ flex: 1, minWidth: '12rem' }}>{q.prompt}</span>
        <select
          className="select"
          value={value}
          disabled={readOnly}
          onChange={(e) => set(e.target.value)}
          aria-label={`Answer ${n}`}
        >
          <option value="">—</option>
          {group.options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.key}
            </option>
          ))}
        </select>
      </div>
    );
  } else if (type === 'SENTENCE_COMPLETION' && q.prompt.includes('{{')) {
    body = (
      <div style={{ lineHeight: 2 }}>
        <GapText text={q.prompt} {...props} />
      </div>
    );
  } else if (type === 'DIAGRAM_LABEL_COMPLETION') {
    body = (
      <div className="row">
        <span className="muted">Label {n}</span>
        <GapInput n={n} {...props} />
      </div>
    );
  } else if (type === 'SHORT_ANSWER' || (type === 'SENTENCE_COMPLETION' && q.prompt)) {
    body = (
      <div className="stack" style={{ gap: '0.35rem' }}>
        <span>{q.prompt}</span>
        <GapInput n={n} {...props} />
      </div>
    );
  } else {
    // context-based gaps are rendered above; list only feedback rows in review mode
    if (!results) return null;
    body = <span className="muted">Gap {n}</span>;
  }

  return (
    <div className="q" id={`q-${n}`}>
      <span
        className={`q-num${result ? (result.correct ? ' correct' : ' wrong') : value ? ' answered' : ''}`}
      >
        {n}
      </span>
      <div>
        {body}
        {result && <Feedback n={n} result={result} onShowEvidence={props.onShowEvidence} />}
      </div>
    </div>
  );
}

function ChooseMany(props: QuestionGroupProps) {
  const { group, offset, answers, onAnswer, results } = props;
  const numbers = group.questions.map((q) => q.number + offset);
  const selected = numbers.map((n) => answers[n]).filter((v): v is string => !!v);
  const readOnly = !onAnswer;

  function toggle(key: string) {
    if (!onAnswer) return;
    let next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    if (next.length > numbers.length) next = next.slice(next.length - numbers.length);
    next.sort();
    numbers.forEach((n, i) => onAnswer(n, next[i] ?? ''));
  }

  return (
    <div className="q">
      <span className="q-num">
        {numbers.length > 1 ? `${numbers[0]}–${numbers[numbers.length - 1]}` : numbers[0]}
      </span>
      <div>
        <div>{group.questions[0]?.prompt}</div>
        <div className="choice-list">
          {group.options.map((o) => (
            <label key={o.key} className={`choice${selected.includes(o.key) ? ' selected' : ''}`}>
              <input
                type="checkbox"
                checked={selected.includes(o.key)}
                disabled={readOnly}
                onChange={() => toggle(o.key)}
              />
              <span>
                <strong>{o.key}</strong> {o.text}
              </span>
            </label>
          ))}
        </div>
        {results &&
          numbers.map((n) =>
            results[n] ? (
              <Feedback key={n} n={n} result={results[n]!} onShowEvidence={props.onShowEvidence} />
            ) : null,
          )}
      </div>
    </div>
  );
}

function GapText(props: QuestionGroupProps & { text: string; wordBank?: boolean }) {
  return (
    <>
      {splitGaps(props.text).map((part, i) =>
        typeof part === 'string' ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <GapInput key={i} n={part.gap + props.offset} {...props} />
        ),
      )}
    </>
  );
}

function GapInput(props: QuestionGroupProps & { n: number; wordBank?: boolean }) {
  const { n, answers, onAnswer, results, group, wordBank } = props;
  const value = answers[n] ?? '';
  const result = results?.[n];
  const style = result ? { borderBottomColor: result.correct ? 'var(--good)' : 'var(--bad)' } : undefined;
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <span className="gap-num">{n}</span>
      {wordBank ? (
        <select
          className="gap-input"
          style={{ ...style, width: 'auto' }}
          value={value}
          disabled={!onAnswer}
          onChange={(e) => onAnswer?.(n, e.target.value)}
          aria-label={`Answer ${n}`}
        >
          <option value="">—</option>
          {group.options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.key}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="gap-input"
          style={style}
          value={value}
          readOnly={!onAnswer}
          onChange={(e) => onAnswer?.(n, e.target.value)}
          aria-label={`Answer ${n}`}
          autoComplete="off"
          spellCheck={false}
        />
      )}
    </span>
  );
}

function GapTable(props: QuestionGroupProps & { wordBank: boolean }) {
  const { table } = props.group;
  return (
    <div className="table-wrap" style={{ marginBottom: '0.75rem' }}>
      {table.title && <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{table.title}</div>}
      <table className="gap-table">
        {table.columns.length > 0 && (
          <thead>
            <tr>
              {table.columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} style={{ lineHeight: 2 }}>
                  <GapText text={cell} {...props} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Feedback({
  n,
  result,
  onShowEvidence,
}: {
  n: number;
  result: Result;
  onShowEvidence?: (n: number) => void;
}) {
  return (
    <div className="q-feedback">
      <div>
        {result.correct ? (
          <span className="badge badge-good">✓ Correct</span>
        ) : result.blank ? (
          <span className="badge badge-warn">Left blank</span>
        ) : (
          <span className="badge badge-bad">✗ You wrote “{result.given}”</span>
        )}{' '}
        {!result.correct && (
          <span>
            Answer: <strong>{result.expected.join(' / ')}</strong>
          </span>
        )}
        {result.note && <span className="muted"> — {result.note}</span>}
      </div>
      {result.justification && (
        <div className="quote">
          “{result.justification}”{' '}
          {onShowEvidence && (
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => onShowEvidence(n)}>
              Show in {/^\d+$/.test(result.location) ? 'script' : 'passage'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
