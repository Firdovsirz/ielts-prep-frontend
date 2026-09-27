import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { BandPill, ErrorBox, Loading, PageHeader } from '../../components/ui';
import { CriteriaGrid, ErrorList, FeedbackList, HighlightedText } from '../../components/feedback';
import { TaskPrompt } from './WritingSession';
import { formatMinutes } from '../../lib/format';

type Attempt = Schemas['WritingAttemptView'];

export function WritingResult() {
  const { id } = useParams();
  const sessionId = Number(id);
  const result = useQuery({
    queryKey: ['writing', 'result', sessionId],
    queryFn: () =>
      unwrap(api.GET('/api/writing/sessions/{id}/result', { params: { path: { id: sessionId } } })),
    refetchInterval: (q) => (q.state.data?.status === 'GRADING' ? 3000 : false),
  });
  const [active, setActive] = useState(0);

  if (result.isLoading) return <Loading />;
  if (result.error || !result.data)
    return (
      <div className="page">
        <ErrorBox error={result.error} />
      </div>
    );
  const r = result.data;
  const attempt = r.attempts[active];
  const task = r.tasks.find((t) => t.itemId === attempt?.itemId);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Writing results"
        title={r.status === 'GRADING' ? 'Your examiner is reading…' : 'Writing feedback'}
        subtitle={
          r.writingBand != null
            ? r.bandIsEstimate
              ? 'Single-task band shown; a full test combines Task 1 + 2 × Task 2.'
              : 'Writing band = (Task 1 + 2 × Task 2) ÷ 3, rounded to the nearest half band.'
            : 'Grading usually takes under a minute.'
        }
        actions={
          <>
            {r.writingBand != null && <BandPill band={r.writingBand} large label="Writing band" />}
            <Link className="btn btn-secondary" to="/writing">
              Back to Writing
            </Link>
          </>
        }
      />
      {r.attempts.length > 1 && (
        <div className="tabs">
          {r.attempts.map((a, i) => (
            <button
              key={a.attemptId}
              className={`tab${i === active ? ' active' : ''}`}
              onClick={() => setActive(i)}
            >
              Task {a.task} {a.band != null && `— ${a.band.toFixed(1)}`}
            </button>
          ))}
        </div>
      )}
      {attempt && (
        <AttemptFeedback
          attempt={attempt}
          sessionId={sessionId}
          taskPrompt={task ? <TaskPrompt task={task} /> : null}
        />
      )}
    </div>
  );
}

function AttemptFeedback({
  attempt,
  sessionId,
  taskPrompt,
}: {
  attempt: Attempt;
  sessionId: number;
  taskPrompt: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [showModel, setShowModel] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const regrade = useMutation({
    mutationFn: () =>
      unwrap(api.POST('/api/writing/attempts/{id}/regrade', { params: { path: { id: attempt.attemptId } } })),
    onSuccess: (data) => queryClient.setQueryData(['writing', 'result', sessionId], data),
  });
  const g = attempt.grade;
  const marks = useMemo(() => (g?.errors ?? []).map((e, i) => ({ original: e.original, id: i })), [g]);

  if (attempt.status === 'GRADING') {
    return (
      <div className="card grading-card">
        <div className="pulse-ring" />
        <div>
          <h3>Grading Task {attempt.task}</h3>
          <p className="muted">
            Assessing Task Response, Coherence & Cohesion, Lexical Resource and Grammatical Range & Accuracy…
          </p>
        </div>
      </div>
    );
  }
  if (!g) {
    return (
      <div className="card stack">
        <div className="alert alert-warn">
          <strong>Not graded yet.</strong> {attempt.error}
        </div>
        <p className="muted small">
          Your response is saved ({attempt.wordCount} words). Grading needs an Anthropic API key in .env.
        </p>
        <div className="row">
          <button className="btn" disabled={regrade.isPending} onClick={() => regrade.mutate()}>
            Grade now
          </button>
        </div>
        <ErrorBox error={regrade.error} />
        <pre className="transcript">{attempt.text}</pre>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: '1rem' }}>
      <div className="card hero-result">
        <div>
          <div className="eyebrow">Task {attempt.task} band</div>
          <BandPill band={attempt.band} large />
        </div>
        <div className="stack" style={{ gap: '0.3rem', flex: 1 }}>
          <p style={{ margin: 0 }}>{g.overall_comment}</p>
          <span className="small muted">
            {attempt.wordCount} words · {formatMinutes(attempt.secondsSpent)} · {g.word_count_comment}
          </span>
        </div>
      </div>
      <CriteriaGrid criteria={g.criteria} />
      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">
            <h3>Your response</h3>
            <span className="small muted">Hover a highlight for the correction</span>
          </div>
          <HighlightedText text={attempt.text} marks={marks} focus={focus} errors={g.errors} />
        </div>
        <div className="stack">
          <div className="card">
            <h3>Three things that would raise your band</h3>
            <FeedbackList items={g.improvements} numbered />
          </div>
          <div className="card">
            <h3>Errors ({g.errors.length})</h3>
            <ErrorList errors={g.errors} onFocus={setFocus} />
          </div>
          {g.vocabulary_upgrades.length > 0 && (
            <div className="card">
              <h3>Vocabulary upgrades</h3>
              <p className="small muted">Added to your vocabulary deck.</p>
              <ul className="list-plain stack" style={{ gap: '0.5rem' }}>
                {g.vocabulary_upgrades.map((v, i) => (
                  <li key={i}>
                    <span className="strike">{v.original}</span> → <strong>{v.better}</strong>
                    <div className="small muted">{v.example}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-title">
          <h3>Task & model answer</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowModel((s) => !s)}>
            {showModel ? 'Hide' : 'Show'} model answer
          </button>
        </div>
        {taskPrompt}
        {showModel && <div className="model-answer">{g.model_answer}</div>}
      </div>
    </div>
  );
}
