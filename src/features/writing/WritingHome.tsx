import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, Loading, PageHeader } from '../../components/ui';
import { ModuleIcon } from '../../components/icons';
import { titleCase } from '../../lib/format';

type StartBody = Schemas['WritingStartRequest'];

const OPTIONS: { scope: StartBody['scope']; title: string; minutes: number; text: string }[] = [
  {
    scope: 'TASK1',
    title: 'Task 1',
    minutes: 20,
    text: 'Describe a real chart, table, process or pair of maps in at least 150 words.',
  },
  {
    scope: 'TASK2',
    title: 'Task 2',
    minutes: 40,
    text: 'A discursive essay of at least 250 words. Topics rotate so you cover the whole pool.',
  },
  {
    scope: 'TEST',
    title: 'Full Writing test',
    minutes: 60,
    text: 'Both tasks under exam conditions. Task 2 counts twice as much as Task 1.',
  },
];

export function WritingHome() {
  const navigate = useNavigate();
  const prompts = useQuery({
    queryKey: ['writing', 'prompts'],
    queryFn: () => unwrap(api.GET('/api/writing/prompts')),
  });
  const coverage = useQuery({
    queryKey: ['writing', 'coverage'],
    queryFn: () => unwrap(api.GET('/api/writing/topic-coverage')),
  });
  const start = useMutation({
    mutationFn: (body: StartBody) => unwrap(api.POST('/api/writing/sessions', { body })),
    onSuccess: (s) => navigate(`/writing/session/${s.sessionId}`),
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="Writing"
        title="Write, get examiner-grade feedback, fix your patterns"
        subtitle="Graded on all four criteria against the public band descriptors. Every grammar error you make feeds your personal Grammar drills."
        icon={<ModuleIcon module="WRITING" size={28} />}
      />
      <ErrorBox error={start.error} title="Could not start" />
      <div className="grid grid-3">
        {OPTIONS.map((o) => (
          <div key={o.scope} className="card card-hover stack">
            <div className="row-between">
              <h3>{o.title}</h3>
              <span className="badge">{o.minutes} min</span>
            </div>
            <p className="muted small">{o.text}</p>
            <div className="row" style={{ marginTop: 'auto' }}>
              <button
                className="btn"
                disabled={start.isPending}
                onClick={() => start.mutate({ mode: 'EXAM', scope: o.scope })}
              >
                Exam mode
              </button>
              <button
                className="btn btn-secondary"
                disabled={start.isPending}
                onClick={() => start.mutate({ mode: 'PRACTICE', scope: o.scope })}
              >
                Practice
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginTop: '1rem' }}>
        <div className="card">
          <div className="card-title">
            <h2>Task 2 topic coverage</h2>
            <span className="small muted">Least-practised topics are served first</span>
          </div>
          {coverage.data ? (
            <div className="topic-cloud">
              {Object.entries(coverage.data).map(([topic, n]) => (
                <span key={topic} className={`topic-chip${n === 0 ? ' untouched' : ''}`}>
                  {titleCase(topic)} <b>{n}</b>
                </span>
              ))}
            </div>
          ) : (
            <Loading />
          )}
        </div>
        <div className="card">
          <div className="card-title">
            <h2>Prompt bank</h2>
            <span className="small muted">{prompts.data?.length ?? 0} verified prompts</span>
          </div>
          {prompts.isLoading && <Loading />}
          <div className="stack" style={{ gap: '0.4rem', maxHeight: 340, overflowY: 'auto' }}>
            {prompts.data?.map((p) => (
              <div key={p.id} className="row-between list-row">
                <div style={{ minWidth: 0 }}>
                  <div className="truncate">
                    <span className="badge badge-primary">
                      {p.taskType === 'WRITING_TASK2' ? 'Task 2' : 'Task 1'}
                    </span>{' '}
                    {p.title}
                  </div>
                  <div className="small muted">
                    {titleCase(p.variant ?? '')} · {titleCase(p.topic ?? '')} · used {p.timesServed}×
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={start.isPending}
                  onClick={() => start.mutate({ mode: 'PRACTICE', scope: 'TASK1', itemId: p.id })}
                >
                  Write
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
