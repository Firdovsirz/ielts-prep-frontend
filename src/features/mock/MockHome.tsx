import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { ErrorBox, Loading, PageHeader } from '../../components/ui';
import { Icon, ModuleIcon } from '../../components/icons';
import { formatBand, formatDateTime } from '../../lib/format';
import { PAPER_NAMES } from '../../lib/mock';

const PAPERS = [
  { module: 'LISTENING', minutes: '30 min + check', text: '4 parts · 40 questions · played once' },
  { module: 'READING', minutes: '60 min', text: '3 passages · 40 questions' },
  { module: 'WRITING', minutes: '60 min', text: 'Task 1 + Task 2' },
  { module: 'SPEAKING', minutes: '11–14 min', text: 'Parts 1–3 with the examiner' },
] as const;

export function MockHome() {
  const navigate = useNavigate();
  const mocks = useQuery({ queryKey: ['mock'], queryFn: () => unwrap(api.GET('/api/mock')) });
  const start = useMutation({
    mutationFn: () => unwrap(api.POST('/api/mock')),
    onSuccess: (m) => navigate(`/mock/${m.id}`),
  });

  if (mocks.isLoading) return <Loading />;
  const list = mocks.data ?? [];
  const inProgress = list.find((m) => m.status === 'IN_PROGRESS');

  return (
    <div className="page">
      <PageHeader
        eyebrow="Full mock test"
        title="Sit the whole test"
        subtitle="All four papers back to back in exam mode with real timings — the most reliable estimate of your overall band."
        icon={
          <span className="module-icon plan-general">
            <Icon name="mock" size={28} strokeWidth={2} />
          </span>
        }
      />
      <ErrorBox error={mocks.error ?? start.error} />

      <section className="mock-hero">
        <div className="mock-papers">
          {PAPERS.map((p, i) => (
            <div key={p.module} className="mock-paper">
              <span className="mock-paper-num">{i + 1}</span>
              <ModuleIcon module={p.module} size={18} />
              <div>
                <strong>{PAPER_NAMES[p.module]}</strong>
                <span>{p.text}</span>
              </div>
              <span className="mock-paper-time">{p.minutes}</span>
            </div>
          ))}
        </div>
        <div className="mock-cta">
          <div>
            <h2>About 2 hours 50 minutes</h2>
            <p>
              Listening, Reading and Writing run without breaks, exactly like test day. Find a quiet room, use
              headphones and have your microphone ready for Speaking. Results appear only when every paper is
              finished.
            </p>
          </div>
          <button className="btn btn-lg btn-light" onClick={() => start.mutate()} disabled={start.isPending}>
            {inProgress ? 'Resume your mock test' : 'Start the mock test'}
          </button>
        </div>
      </section>

      <h2 className="section-title">Your mock tests</h2>
      {list.length === 0 ? (
        <div className="card empty">No mock tests yet — your first one sets a baseline for every skill.</div>
      ) : (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Status</th>
                <th>Listening</th>
                <th>Reading</th>
                <th>Writing</th>
                <th>Speaking</th>
                <th>Overall</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td>{formatDateTime(m.startedAt)}</td>
                  <td>
                    <span
                      className={`badge ${m.status === 'COMPLETED' ? 'badge-good' : m.status === 'ABANDONED' ? '' : 'badge-accent'}`}
                    >
                      {m.status === 'IN_PROGRESS'
                        ? `${PAPER_NAMES[m.stage] ?? m.stage} next`
                        : m.status.toLowerCase()}
                    </span>
                  </td>
                  <td>{formatBand(m.listening)}</td>
                  <td>{formatBand(m.reading)}</td>
                  <td>{formatBand(m.writing)}</td>
                  <td>{formatBand(m.speaking)}</td>
                  <td>
                    {m.overall != null ? <span className="band-pill">{formatBand(m.overall)}</span> : '—'}
                  </td>
                  <td>
                    {m.status !== 'ABANDONED' && (
                      <Link
                        className="btn btn-ghost btn-sm"
                        to={m.status === 'IN_PROGRESS' ? `/mock/${m.id}` : `/mock/report/${m.id}`}
                      >
                        {m.status === 'IN_PROGRESS' ? 'Resume' : 'Report'}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
