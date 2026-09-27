import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, Loading, PageHeader } from '../../components/ui';
import { formatBand, formatDateTime, formatMinutes, titleCase } from '../../lib/format';
import { downloadExport } from '../../lib/download';

function resultLink(r: Schemas['HistoryRow']): string | null {
  if (r.status === 'IN_PROGRESS') {
    if (r.module === 'READING') return `/reading/session/${r.sessionId}`;
    if (r.module === 'WRITING') return `/writing/session/${r.sessionId}`;
    if (r.module === 'LISTENING') return `/listening/session/${r.sessionId}`;
    if (r.module === 'SPEAKING') return `/speaking/session/${r.sessionId}`;
  }
  switch (r.module) {
    case 'READING':
      return `/reading/result/${r.sessionId}`;
    case 'WRITING':
      return `/writing/result/${r.sessionId}`;
    case 'LISTENING':
      return `/listening/result/${r.sessionId}`;
    case 'SPEAKING':
      return `/speaking/result/${r.sessionId}`;
    case 'GRAMMAR':
      return r.kind === 'GRAMMAR_DIAGNOSTIC' ? null : `/grammar/session/${r.sessionId}`;
    default:
      return null;
  }
}

export function HistoryPage() {
  const q = useQuery({ queryKey: ['history'], queryFn: () => unwrap(api.GET('/api/history')) });
  return (
    <div className="page">
      <PageHeader
        eyebrow="Records"
        title="Session history"
        subtitle="Every practice and exam session, newest first. Everything is kept — export it any time."
        actions={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => downloadExport('json')}>
              Export JSON
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => downloadExport('csv')}>
              Export CSV
            </button>
          </>
        }
      />
      {q.isLoading && <Loading />}
      <ErrorBox error={q.error} />
      {q.data && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Module</th>
                <th>What</th>
                <th>Mode</th>
                <th>Time</th>
                <th>Score</th>
                <th>Band</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {q.data.map((r) => {
                const link = resultLink(r);
                return (
                  <tr key={r.sessionId}>
                    <td className="small">{formatDateTime(r.startedAt)}</td>
                    <td>
                      <span className={`badge module-badge m-${r.module.toLowerCase()}`}>
                        {titleCase(r.module)}
                      </span>
                    </td>
                    <td>
                      <div>
                        {titleCase(r.kind.replace(/^(READING|WRITING|LISTENING|SPEAKING|GRAMMAR)_/, ''))}
                      </div>
                      {r.title && (
                        <div className="small muted truncate" style={{ maxWidth: 320 }}>
                          {r.title}
                        </div>
                      )}
                    </td>
                    <td className="small">{titleCase(r.mode)}</td>
                    <td className="small">{formatMinutes(r.timeUsedSeconds)}</td>
                    <td className="small">
                      {r.rawScore != null && r.maxScore != null ? `${r.rawScore}/${r.maxScore}` : '—'}
                    </td>
                    <td>{r.band != null ? <span className="band-pill">{formatBand(r.band)}</span> : '—'}</td>
                    <td>
                      {link && (
                        <Link to={link} className="btn btn-ghost btn-sm">
                          {r.status === 'IN_PROGRESS' ? 'Resume' : 'Open'}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {q.data.length === 0 && <div className="empty">No sessions yet — pick a module to start.</div>}
        </div>
      )}
    </div>
  );
}
