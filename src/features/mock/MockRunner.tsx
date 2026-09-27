import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { ErrorBox, Loading } from '../../components/ui';
import { ModuleIcon, Wordmark } from '../../components/icons';
import { PAPER_NAMES, paperRules } from '../../lib/mock';
import { MicCheck } from '../speaking/SpeakingHome';

/** Full-screen runner between papers: shows progress, the next paper's rules and starts it. */
export function MockRunner() {
  const { id } = useParams();
  const mockId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mock = useQuery({
    queryKey: ['mock', mockId],
    queryFn: () => unwrap(api.GET('/api/mock/{id}', { params: { path: { id: mockId } } })),
  });
  const begin = useMutation({
    mutationFn: () => unwrap(api.POST('/api/mock/{id}/stage', { params: { path: { id: mockId } } })),
    onSuccess: (m) => {
      const stage = m.stages.find((s) => s.module === m.stage);
      if (stage?.sessionId) navigate(`/${m.stage.toLowerCase()}/session/${stage.sessionId}`);
    },
  });
  const abandon = useMutation({
    mutationFn: () => unwrap(api.POST('/api/mock/{id}/abandon', { params: { path: { id: mockId } } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mock'] });
      navigate('/mock');
    },
  });

  const m = mock.data;
  useEffect(() => {
    if (m && m.status !== 'IN_PROGRESS') navigate(`/mock/report/${m.id}`, { replace: true });
  }, [m, navigate]);

  if (mock.isLoading) return <Loading />;
  if (!m) return <ErrorBox error={mock.error} />;
  const index = m.stages.findIndex((s) => s.module === m.stage);
  const current = m.stages[index];
  const resuming = current?.state === 'IN_PROGRESS';

  return (
    <div className="exam-shell mock-shell">
      <div className="exam-bar">
        <Link to="/mock" className="exam-exit" title="Leave — the mock test is saved and can be resumed">
          ✕ Exit
        </Link>
        <span className="exam-brand">IELTS · Full mock test</span>
        <span className="badge badge-accent">Exam conditions</span>
      </div>
      <main className="mock-runner">
        <ol className="mock-steps">
          {m.stages.map((s, i) => (
            <li
              key={s.module}
              className={`mock-step ${s.state === 'COMPLETED' ? 'done' : i === index ? 'current' : ''}`}
            >
              <span className="mock-step-dot">{s.state === 'COMPLETED' ? '✓' : i + 1}</span>
              <span>
                <strong>{PAPER_NAMES[s.module]}</strong>
                <small>{s.minutes} min</small>
              </span>
            </li>
          ))}
          <li className="mock-step">
            <span className="mock-step-dot">★</span>
            <span>
              <strong>Band report</strong>
              <small>all four papers</small>
            </span>
          </li>
        </ol>

        {current && (
          <section className="mock-stage-card">
            <div className="row" style={{ gap: '0.9rem' }}>
              <ModuleIcon module={current.module as 'LISTENING'} size={26} />
              <div>
                <div className="eyebrow">
                  Paper {index + 1} of 4 · {current.minutes} minutes
                </div>
                <h1>{PAPER_NAMES[current.module]}</h1>
              </div>
            </div>
            <p className="muted">{current.label}</p>
            <ul className="mock-rules">
              {paperRules(current.module, current.minutes).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {current.module === 'SPEAKING' && !resuming && (
              <div className="mock-mic">
                <MicCheck />
              </div>
            )}
            <ErrorBox error={begin.error} />
            <div className="row-between" style={{ marginTop: '1.4rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => abandon.mutate()}
                disabled={abandon.isPending}
              >
                Abandon this mock
              </button>
              <button className="btn btn-lg" onClick={() => begin.mutate()} disabled={begin.isPending}>
                {resuming ? `Resume ${PAPER_NAMES[current.module]}` : `Start ${PAPER_NAMES[current.module]}`}{' '}
                →
              </button>
            </div>
            {index > 0 && index < 3 && !resuming && (
              <p className="small muted" style={{ marginTop: '1rem' }}>
                On test day the next paper follows immediately — start when you are ready.
              </p>
            )}
          </section>
        )}
        <Wordmark subtitle="Mock test" />
      </main>
    </div>
  );
}
