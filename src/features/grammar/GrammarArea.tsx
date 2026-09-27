import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import { api, unwrap } from '../../api/client';
import { ErrorBox, Loading, PageHeader } from '../../components/ui';
import { ModuleIcon } from '../../components/icons';
import { titleCase } from '../../lib/format';

export function GrammarArea() {
  const { area = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ['grammar', 'area', area],
    queryFn: () => unwrap(api.GET('/api/grammar/areas/{area}', { params: { path: { area } } })),
  });
  const start = useMutation({
    mutationFn: (itemId: number) =>
      unwrap(api.POST('/api/grammar/exercises/{itemId}/start', { params: { path: { itemId } } })),
    onSuccess: (s) => navigate(`/grammar/session/${s.sessionId}`),
  });
  const generate = useMutation({
    mutationFn: () => unwrap(api.POST('/api/grammar/areas/{area}/generate', { params: { path: { area } } })),
    onSuccess: () =>
      window.setTimeout(() => queryClient.invalidateQueries({ queryKey: ['grammar', 'area', area] }), 60_000),
  });

  if (detail.isLoading) return <Loading />;
  const d = detail.data;
  if (!d) return <ErrorBox error={detail.error} />;
  const l = d.lesson;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Grammar area"
        title={d.area.name}
        subtitle={d.area.focus}
        icon={<ModuleIcon module="GRAMMAR" size={28} />}
        actions={
          <Link to="/grammar" className="btn btn-secondary">
            All areas
          </Link>
        }
      />
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
        <div className="stack" style={{ gap: '1.1rem' }}>
          {l && (
            <div className="card lesson">
              <div className="eyebrow">Lesson</div>
              <h2>{l.title}</h2>
              <p className="lead">{l.summary}</p>
              <div className="markdown">
                <Markdown>{l.explanation}</Markdown>
              </div>
              <h3>Key rules</h3>
              <ul className="rule-list">
                {l.key_rules.map((r, i) => (
                  <li key={i}>
                    <strong>{r.rule}</strong>
                    <span className="example">{r.example}</span>
                  </li>
                ))}
              </ul>
              <h3>Mistakes candidates make</h3>
              <div className="stack" style={{ gap: '0.5rem' }}>
                {l.common_mistakes.map((m, i) => (
                  <div key={i} className="mistake">
                    <div>
                      <span className="strike">{m.wrong}</span>
                    </div>
                    <div>
                      ✓ <strong>{m.right}</strong>
                    </div>
                    <div className="small muted">{m.why}</div>
                  </div>
                ))}
              </div>
              <h3>Band 7+ examples</h3>
              <ul className="list-plain stack" style={{ gap: '0.5rem' }}>
                {l.ielts_examples.map((e, i) => (
                  <li key={i}>
                    <span className="badge">{titleCase(e.context)}</span> <em>{e.sentence}</em>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="stack" style={{ gap: '1.1rem' }}>
          <div className="card">
            <div className="card-title">
              <h3>Exercises</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => generate.mutate()}
                disabled={generate.isPending}
              >
                + New set
              </button>
            </div>
            {generate.isSuccess && <div className="alert alert-info small">{generate.data.message}</div>}
            <ErrorBox error={generate.error ?? start.error} />
            <div className="stack" style={{ gap: 0 }}>
              {d.sets.map((s) => (
                <div key={s.itemId} className="list-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="truncate">{s.title}</div>
                    <div className="small muted">
                      {titleCase(s.exerciseType)} · {s.itemCount} items
                      {s.lastScore != null && ` · last ${Math.round(s.lastScore)}%`}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={() => start.mutate(s.itemId)}
                    disabled={start.isPending}
                  >
                    {s.timesServed > 0 ? 'Redo' : 'Start'}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Your errors in this area</h3>
            {d.recentErrors.length === 0 ? (
              <p className="muted small">None logged yet.</p>
            ) : (
              <ul className="list-plain error-list">
                {d.recentErrors.map((e) => (
                  <li key={e.errorId}>
                    <span className="small muted">{titleCase(e.subtype)}</span>
                    <div>
                      <span className="strike">{e.original}</span> → <strong>{e.correction}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
