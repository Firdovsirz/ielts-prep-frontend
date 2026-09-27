import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, Loading, PageHeader } from '../../components/ui';
import { titleCase } from '../../lib/format';

type Item = Schemas['ExerciseItem'];
type Result = Schemas['GrammarResultView'];

const isSentenceTask = (type: string) => type !== 'GAP_FILL';

export function GrammarSession() {
  const { id } = useParams();
  const sessionId = Number(id);
  const session = useQuery({
    queryKey: ['grammar', 'session', sessionId],
    queryFn: () => unwrap(api.GET('/api/grammar/sessions/{id}', { params: { path: { id: sessionId } } })),
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const submit = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/api/grammar/sessions/{id}/submit', {
          params: { path: { id: sessionId } },
          body: { answers },
        }),
      ),
    onSuccess: setResult,
  });
  const selfAssess = useMutation({
    mutationFn: (verdicts: Record<string, boolean>) =>
      unwrap(
        api.POST('/api/grammar/sessions/{id}/self-assess', {
          params: { path: { id: sessionId } },
          body: { verdicts },
        }),
      ),
    onSuccess: setResult,
  });
  const existing = useQuery({
    queryKey: ['grammar', 'result', sessionId],
    queryFn: () =>
      unwrap(api.GET('/api/grammar/sessions/{id}/result', { params: { path: { id: sessionId } } })),
    enabled: session.data?.status === 'COMPLETED' && !result,
  });

  if (session.isLoading) return <Loading />;
  const s = session.data;
  if (!s) return <ErrorBox error={session.error} />;
  const shown = result ?? existing.data ?? null;
  const drill = s.kind === 'GRAMMAR_ERROR_DRILL';

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHeader
        eyebrow={`${s.areaName} · ${drill ? 'Error drill' : titleCase(s.exerciseType)}`}
        title={s.title}
        subtitle={s.instructions}
        actions={
          <Link className="btn btn-secondary" to={`/grammar/area/${s.area}`}>
            Area lesson
          </Link>
        }
      />
      {shown ? (
        <ResultPanel r={shown} onSelfAssess={(v) => selfAssess.mutate(v)} busy={selfAssess.isPending} />
      ) : (
        <div className="stack" style={{ gap: '1rem' }}>
          {drill && s.ownSentence && (
            <div className="card own-sentence">
              <div className="eyebrow">You wrote</div>
              <p>“{s.ownSentence}”</p>
            </div>
          )}
          {s.items.map((item, i) => (
            <ItemInput
              key={item.id}
              n={i + 1}
              item={item}
              type={item.id === 'own' ? 'ERROR_CORRECTION' : s.exerciseType}
              value={answers[item.id] ?? ''}
              onChange={(v) => setAnswers((a) => ({ ...a, [item.id]: v }))}
            />
          ))}
          <ErrorBox error={submit.error} />
          <div className="row">
            <button className="btn btn-lg" onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? 'Checking…' : 'Check answers'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemInput({
  n,
  item,
  type,
  value,
  onChange,
}: {
  n: number;
  item: Item;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const prefill =
    type === 'ERROR_CORRECTION' ? item.prompt.replace(/^This is your own sentence\. Correct it: /, '') : '';
  return (
    <div className="card exercise-item">
      <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <span className="q-num">{item.id === 'own' ? '★' : n}</span>
        <div style={{ flex: 1 }} className="stack">
          <div className="exercise-prompt">{item.prompt}</div>
          {item.options.length > 0 ? (
            <div className="row">
              {item.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={`option-chip${value === o ? ' chosen' : ''}`}
                  onClick={() => onChange(o)}
                >
                  {o}
                </button>
              ))}
            </div>
          ) : isSentenceTask(type) ? (
            <textarea
              className="textarea"
              rows={type === 'FREE_WRITING' ? 4 : 2}
              value={value}
              placeholder={prefill || 'Write your answer…'}
              onFocus={() => !value && prefill && onChange(prefill)}
              onChange={(e) => onChange(e.target.value)}
              spellCheck={false}
            />
          ) : (
            <input
              className="input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Answer for the gap"
              spellCheck={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  r,
  onSelfAssess,
  busy,
}: {
  r: Result;
  onSelfAssess: (v: Record<string, boolean>) => void;
  busy: boolean;
}) {
  return (
    <div className="stack" style={{ gap: '1rem' }}>
      <div className="card hero-result">
        <div>
          <div className="eyebrow">Score</div>
          <span className="band-pill lg">
            {r.score}/{r.max}
          </span>
        </div>
        <div className="stack" style={{ gap: '0.3rem', flex: 1 }}>
          {r.rule && <p style={{ margin: 0 }}>{r.rule}</p>}
          <span className="small muted">
            {r.areaName} proficiency now {r.proficiency == null ? '—' : Math.round(r.proficiency)} / 100
            {r.pending > 0 && ` · ${r.pending} answer(s) waiting for your self-assessment`}
          </span>
        </div>
        <Link className="btn btn-secondary" to="/grammar">
          Back to Grammar
        </Link>
      </div>
      {r.items.map((it, i) => (
        <div
          key={it.id}
          className={`card exercise-item ${it.correct === true ? 'ok' : it.correct === false ? 'bad' : 'pending'}`}
        >
          <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <span
              className={`q-num ${it.correct === true ? 'correct' : it.correct === false ? 'wrong' : ''}`}
            >
              {it.id === 'own' ? '★' : i + 1}
            </span>
            <div className="stack" style={{ gap: '0.35rem', flex: 1 }}>
              <div className="exercise-prompt">{it.prompt}</div>
              <div>
                Your answer: <strong>{it.given || '—'}</strong>{' '}
                <span className={`badge ${it.method === 'AI' ? 'badge-primary' : ''}`}>
                  {it.method === 'AI'
                    ? 'checked by Claude'
                    : it.method === 'SELF'
                      ? 'self-marked'
                      : 'auto-marked'}
                </span>
              </div>
              {it.feedback && <div className="small">{it.feedback}</div>}
              {it.improvedVersion && it.correct === false && (
                <div className="small">
                  Improved: <strong>{it.improvedVersion}</strong>
                </div>
              )}
              <div className="small muted">
                Model answer: <strong>{it.modelAnswer || it.acceptedAnswers.join(' / ')}</strong>
              </div>
              {it.explanation && <div className="small muted">{it.explanation}</div>}
              {it.correct == null && (
                <div className="row">
                  <button
                    className="btn btn-sm"
                    disabled={busy}
                    onClick={() => onSelfAssess({ [it.id]: true })}
                  >
                    I got it right
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={busy}
                    onClick={() => onSelfAssess({ [it.id]: false })}
                  >
                    Not quite
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
