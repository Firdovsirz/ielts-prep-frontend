import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, Loading, PageHeader, ProgressBar } from '../../components/ui';
import { heatStep } from '../../lib/chartData';

type Result = Schemas['DiagnosticAnswerResult'];

export function GrammarDiagnostic() {
  const { id } = useParams();
  const diagId = Number(id);
  const queryClient = useQueryClient();
  const diag = useQuery({
    queryKey: ['grammar', 'diagnostic', diagId],
    queryFn: () => unwrap(api.GET('/api/grammar/diagnostic/{id}', { params: { path: { id: diagId } } })),
  });
  const [feedback, setFeedback] = useState<Result | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const answer = useMutation({
    mutationFn: (a: { questionId: string; answer: string }) =>
      unwrap(api.POST('/api/grammar/diagnostic/{id}/answer', { params: { path: { id: diagId } }, body: a })),
    onSuccess: (r) => setFeedback(r),
  });

  function next() {
    if (feedback) queryClient.setQueryData(['grammar', 'diagnostic', diagId], feedback.next);
    setFeedback(null);
    setChosen(null);
    queryClient.invalidateQueries({ queryKey: ['grammar'], exact: true });
  }

  if (diag.isLoading) return <Loading />;
  const d = diag.data;
  if (!d) return <ErrorBox error={diag.error} />;

  if (d.status === 'COMPLETED' && !feedback) {
    const scores = Object.entries(d.scores ?? {}).sort((a, b) => a[1] - b[1]);
    return (
      <div className="page">
        <PageHeader
          eyebrow="Diagnostic complete"
          title="Your grammar profile"
          subtitle="Scores are 0–100 per area. Your weakest areas are listed first — start there."
          actions={
            <Link className="btn" to="/grammar">
              Go to Grammar coach
            </Link>
          }
        />
        <div className="card stack" style={{ gap: '0.5rem' }}>
          {scores.map(([area, score]) => (
            <div key={area} className="area-row static">
              <span className="area-name">{area.replaceAll('_', ' ').toLowerCase()}</span>
              <span className="area-meter">
                <span style={{ width: `${score}%`, background: heatStep(score / 100) }} />
              </span>
              <span className="area-pct">{Math.round(score)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const q = d.question;
  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <PageHeader
        eyebrow={`Diagnostic · question ${Math.min(d.asked + 1, d.total)} of ${d.total}`}
        title="Choose the correct option"
      />
      <ProgressBar value={d.asked} max={d.total} />
      {q && (
        <div className="card stack" style={{ marginTop: '1.2rem' }}>
          <div className="row">
            <span className="badge badge-primary">{q.areaName}</span>
            <span className="badge">Level {q.level}</span>
          </div>
          <p className="diag-prompt">{q.prompt}</p>
          <div className="stack" style={{ gap: '0.5rem' }}>
            {q.options.map((o) => {
              const state = feedback
                ? o.key === feedback.correctAnswer
                  ? ' right'
                  : o.key === chosen
                    ? ' wrong'
                    : ''
                : chosen === o.key
                  ? ' chosen'
                  : '';
              return (
                <button
                  key={o.key}
                  className={`option-btn${state}`}
                  disabled={!!feedback || answer.isPending}
                  onClick={() => {
                    setChosen(o.key);
                    answer.mutate({ questionId: q.id, answer: o.key });
                  }}
                >
                  <b>{o.key}</b> {o.text}
                </button>
              );
            })}
          </div>
          <ErrorBox error={answer.error} />
          {feedback && (
            <div className={`alert ${feedback.correct ? 'alert-good' : 'alert-error'}`}>
              <strong>{feedback.correct ? 'Correct.' : `The answer is ${feedback.correctAnswer}.`}</strong>{' '}
              {feedback.explanation}
              <div style={{ marginTop: '0.6rem' }}>
                <button className="btn btn-sm" onClick={next}>
                  {feedback.next.status === 'COMPLETED' ? 'See my profile' : 'Next question'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
