import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, Loading, PageHeader } from '../../components/ui';
import { titleCase } from '../../lib/format';

type StartBody = Schemas['ReadingStartRequest'];

export function ReadingHome() {
  const navigate = useNavigate();
  const passages = useQuery({
    queryKey: ['reading', 'passages'],
    queryFn: () => unwrap(api.GET('/api/reading/passages')),
  });
  const start = useMutation({
    mutationFn: (body: StartBody) => unwrap(api.POST('/api/reading/sessions', { body })),
    onSuccess: (s) => navigate(`/reading/session/${s.sessionId}`),
  });

  return (
    <div className="page">
      <PageHeader
        title="Reading"
        subtitle="Academic Reading: 3 passages, 40 questions, 60 minutes. Double-click any word in a passage to add it to your vocabulary deck."
      />
      <ErrorBox error={start.error} title="Could not start" />
      <div className="grid grid-3">
        <div className="card stack">
          <h3>Full test — exam mode</h3>
          <p className="muted small">
            Passages 1–3 back to back, 60-minute countdown that auto-submits, no answers until the end.
          </p>
          <button
            className="btn"
            disabled={start.isPending}
            onClick={() => start.mutate({ mode: 'EXAM', scope: 'TEST' })}
          >
            Start 60-minute test
          </button>
        </div>
        <div className="card stack">
          <h3>Full test — practice mode</h3>
          <p className="muted small">Same 40 questions; the clock counts overtime instead of stopping you.</p>
          <button
            className="btn btn-secondary"
            disabled={start.isPending}
            onClick={() => start.mutate({ mode: 'PRACTICE', scope: 'TEST' })}
          >
            Start practice test
          </button>
        </div>
        <div className="card stack">
          <h3>Single passage — 20 minutes</h3>
          <p className="muted small">
            Passage 1 is the most accessible; Passage 3 is the hardest (argument, writer's views).
          </p>
          <div className="row">
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                className="btn btn-secondary btn-sm"
                disabled={start.isPending}
                onClick={() => start.mutate({ mode: 'PRACTICE', scope: 'PASSAGE', difficulty: d })}
              >
                Passage {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-title">
          <h2>Passage bank</h2>
          <span className="muted small">Verified passages; unseen ones are served first.</span>
        </div>
        {passages.isLoading && <Loading />}
        <ErrorBox error={passages.error} />
        {passages.data && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Level</th>
                  <th>Question types</th>
                  <th>Used</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {passages.data.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.title}</strong>
                      <div className="small muted">
                        {p.topic}
                        {p.sourceUrl && (
                          <>
                            {' · '}
                            <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                              topic source
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary">P{p.difficulty}</span>{' '}
                      <span className="badge">{p.cefr}</span>
                    </td>
                    <td className="small">
                      {(p.questionTypes ?? '')
                        .split(',')
                        .filter(Boolean)
                        .map((t) => titleCase(t))
                        .join(', ')}
                    </td>
                    <td>{p.timesServed}×</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={start.isPending}
                        onClick={() => start.mutate({ mode: 'PRACTICE', scope: 'PASSAGE', itemId: p.id })}
                      >
                        Practise
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
