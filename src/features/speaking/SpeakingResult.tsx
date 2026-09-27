import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, authFetch, unwrap, type Schemas } from '../../api/client';
import { BandPill, ErrorBox, Loading, PageHeader } from '../../components/ui';
import { CriteriaGrid, ErrorList, FeedbackList } from '../../components/feedback';

type Response = Schemas['SpeakingResponseView'];

export function SpeakingResult() {
  const { id } = useParams();
  const sessionId = Number(id);
  const queryClient = useQueryClient();
  const result = useQuery({
    queryKey: ['speaking', 'result', sessionId],
    queryFn: () =>
      unwrap(api.GET('/api/speaking/sessions/{id}/result', { params: { path: { id: sessionId } } })),
    refetchInterval: (q) => (q.state.data?.status === 'GRADING' ? 3000 : false),
  });
  const regrade = useMutation({
    mutationFn: (attemptId: number) =>
      unwrap(api.POST('/api/speaking/attempts/{id}/regrade', { params: { path: { id: attemptId } } })),
    onSuccess: (d) => queryClient.setQueryData(['speaking', 'result', sessionId], d),
  });
  if (result.isLoading) return <Loading />;
  const r = result.data;
  if (!r) return <ErrorBox error={result.error} />;
  const g = r.grade;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Speaking results"
        title={r.status === 'GRADING' ? 'The examiner is reviewing your test…' : 'Speaking feedback'}
        subtitle={`${r.words} words spoken${r.wordsPerMinute ? ` · ${r.wordsPerMinute} words per minute` : ''}. Pronunciation cannot be judged from a transcript, so the band uses the other three criteria.`}
        actions={
          <>
            {r.band != null && <BandPill band={r.band} large label="Speaking band" />}
            <Link className="btn btn-secondary" to="/speaking">
              Back to Speaking
            </Link>
          </>
        }
      />
      {r.status === 'GRADING' && (
        <div className="card grading-card">
          <div className="pulse-ring" />
          <p className="muted" style={{ margin: 0 }}>
            Grading Fluency & Coherence, Lexical Resource and Grammatical Range & Accuracy…
          </p>
        </div>
      )}
      {(r.status === 'GRADING_FAILED' || r.error) && r.attemptId != null && (
        <div className="alert alert-warn stack">
          <span>
            <strong>Not graded yet.</strong> {r.error}
          </span>
          <button
            className="btn btn-sm"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => regrade.mutate(r.attemptId!)}
            disabled={regrade.isPending}
          >
            Grade now
          </button>
        </div>
      )}
      {g && (
        <div className="stack" style={{ gap: '1rem' }}>
          <div className="card">
            <p style={{ margin: 0 }}>{g.overall_comment}</p>
          </div>
          <CriteriaGrid
            criteria={g.criteria}
            notAssessable={g.pronunciation_assessable ? [] : ['PRONUNCIATION']}
          />
          <div className="grid grid-2">
            <div className="card">
              <h3>Three things to work on</h3>
              <FeedbackList items={g.improvements} numbered />
              {g.vocabulary_upgrades.length > 0 && (
                <>
                  <h3 style={{ marginTop: '1rem' }}>Vocabulary upgrades</h3>
                  <ul className="list-plain stack" style={{ gap: '0.5rem' }}>
                    {g.vocabulary_upgrades.map((v, i) => (
                      <li key={i}>
                        <span className="strike">{v.original}</span> → <strong>{v.better}</strong>
                        <div className="small muted">{v.example}</div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="card">
              <h3>Errors ({g.errors.length})</h3>
              <ErrorList errors={g.errors} />
            </div>
          </div>
          {g.model_answers.length > 0 && (
            <div className="card">
              <h3>Model answers at your target band</h3>
              {g.model_answers.map((m, i) => (
                <div key={i} className="stack" style={{ gap: '0.3rem', marginBottom: '0.8rem' }}>
                  <strong>{m.question}</strong>
                  <div className="model-answer" style={{ marginTop: 0 }}>
                    {m.answer}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Your answers</h3>
        <div className="stack" style={{ gap: 0 }}>
          {r.responses.map((resp) => (
            <AnswerRow key={resp.id} r={resp} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnswerRow({ r }: { r: Response }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  async function load() {
    const res = await authFetch(`/api/speaking/responses/${r.id}/audio`);
    setUrl(URL.createObjectURL(await res.blob()));
  }
  return (
    <div className="answer-row">
      <div className="row" style={{ gap: '0.4rem' }}>
        <span className="badge badge-primary">Part {r.part}</span>
        <span className="small muted">{r.durationSeconds ?? '?'} s</span>
      </div>
      <div className="small" style={{ fontWeight: 600 }}>
        {r.question}
      </div>
      <div className="transcript">{r.transcript || <span className="muted">(no transcript)</span>}</div>
      {r.hasAudio &&
        (url ? (
          <audio controls src={url} style={{ width: '100%', maxWidth: 420 }} />
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={load} style={{ alignSelf: 'flex-start' }}>
            ▶ Load recording
          </button>
        ))}
    </div>
  );
}
