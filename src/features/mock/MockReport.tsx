import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { BandGauge, ErrorBox, Loading, PageHeader } from '../../components/ui';
import { Icon, ModuleIcon } from '../../components/icons';
import { formatBand, formatDateTime, titleCase } from '../../lib/format';
import { criterionName } from '../../lib/criteria';
import { heatStep } from '../../lib/chartData';
import { moduleClass } from '../../lib/modules';
import { formatDuration, PAPER_NAMES } from '../../lib/mock';

type Mock = Schemas['MockView'];
type Stage = Schemas['MockStageView'];

export function MockReport() {
  const { id } = useParams();
  const mockId = Number(id);
  const mock = useQuery({
    queryKey: ['mock', mockId],
    queryFn: () => unwrap(api.GET('/api/mock/{id}', { params: { path: { id: mockId } } })),
    refetchInterval: (q) =>
      q.state.data?.status === 'GRADING' && q.state.data.stages.some((s) => s.grading === 'PENDING')
        ? 4000
        : false,
  });

  if (mock.isLoading) return <Loading />;
  const m = mock.data;
  if (!m) return <ErrorBox error={mock.error} />;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Full mock test"
        title="Band report"
        subtitle={`Started ${formatDateTime(m.startedAt)}${m.finishedAt ? ` · finished ${formatDateTime(m.finishedAt)}` : ''}`}
        icon={
          <span className="module-icon plan-general">
            <Icon name="mock" size={28} strokeWidth={2} />
          </span>
        }
        actions={
          <Link className="btn btn-secondary" to="/mock">
            All mock tests
          </Link>
        }
      />
      {m.status === 'IN_PROGRESS' && (
        <div className="alert alert-info">
          This mock test is still in progress. <Link to={`/mock/${m.id}`}>Continue it →</Link>
        </div>
      )}
      {m.status === 'ABANDONED' && <div className="alert alert-warn">This mock test was abandoned.</div>}
      {m.status === 'GRADING' && <Grading m={m} />}
      {m.status === 'COMPLETED' && m.report && <Report m={m} report={m.report} />}
    </div>
  );
}

function Grading({ m }: { m: Mock }) {
  const pending = m.stages.some((s) => s.grading === 'PENDING');
  const failed = m.stages.filter((s) => s.grading === 'FAILED' || s.grading === 'SELF_ASSESSED');
  return (
    <div className="stack">
      <div className="card grading-card">
        {pending && <span className="pulse-ring" />}
        <div>
          <h2 style={{ margin: 0 }}>
            {pending ? 'Grading your Writing and Speaking…' : 'Waiting for Writing and Speaking bands'}
          </h2>
          <p className="muted" style={{ margin: '0.3rem 0 0' }}>
            {pending
              ? 'Both are graded against the band descriptors; this usually takes a minute or two. The page updates by itself.'
              : m.gradingAvailable
                ? 'Grading did not finish. Open the paper below and use "Grade now".'
                : 'Writing and Speaking need the Claude API key to be graded. Add ANTHROPIC_API_KEY to .env, restart, then use "Grade now" on each paper.'}
          </p>
        </div>
      </div>
      <PaperGrid stages={m.stages} />
      {failed.length > 0 && (
        <div className="alert alert-warn">
          {failed.map((s) => (
            <div key={s.module}>
              {PAPER_NAMES[s.module]}: {s.grading === 'FAILED' ? 'grading failed' : 'self-assessed'} —{' '}
              <Link to={`/${s.module.toLowerCase()}/result/${s.sessionId}`}>open the paper</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaperGrid({ stages }: { stages: Stage[] }) {
  return (
    <div className="mock-paper-grid">
      {stages.map((s) => (
        <Link
          key={s.module}
          to={s.sessionId ? `/${s.module.toLowerCase()}/result/${s.sessionId}` : '#'}
          className={`mock-result-tile ${moduleClass(s.module as 'LISTENING')}`}
        >
          <div className="row-between">
            <ModuleIcon module={s.module as 'LISTENING'} size={18} />
            <span className="band-pill">
              {s.band != null ? formatBand(s.band) : s.grading === 'PENDING' ? '…' : '—'}
            </span>
          </div>
          <strong>{PAPER_NAMES[s.module]}</strong>
          <span className="small muted">
            {s.raw != null && s.max != null ? `${s.raw}/${s.max} correct · ` : ''}
            {formatDuration(s.timeUsedSeconds)}
          </span>
          <span className="small mock-tile-link">Detailed feedback →</span>
        </Link>
      ))}
    </div>
  );
}

function Report({ m, report }: { m: Mock; report: NonNullable<Mock['report']> }) {
  const gap = report.target - report.overall;
  const speaking = Object.entries(report.speakingCriteria);
  const tasks = Object.entries(report.writingCriteria);
  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <section className="hero mock-report-hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="eyebrow">Overall band</div>
          <h1>{formatBand(report.overall)}</h1>
          <p>{report.verdict}</p>
          <div className="hero-stats">
            {(['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const).map((k) => (
              <div key={k} className="hero-stat">
                <b>{formatBand(report.bands[k])}</b>
                <span>{PAPER_NAMES[k]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-gauges">
          <BandGauge band={report.overall} target={report.target} label="Overall" size={170} />
          <BandGauge
            band={report.target}
            label={gap > 0 ? `${formatBand(gap)} to go` : 'Target met'}
            size={120}
            color="#f2b544"
          />
        </div>
      </section>

      <PaperGrid stages={m.stages} />

      <div className="grid grid-2">
        <div className="card">
          <h3 className="coach-list-title good">Strengths</h3>
          <ul className="coach-list good">
            {report.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3 className="coach-list-title warn">What cost you marks</h3>
          <ul className="coach-list warn">
            {report.weaknesses.length ? (
              report.weaknesses.map((s) => <li key={s}>{s}</li>)
            ) : (
              <li>Nothing stands out — well balanced.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">
            <h3>Listening & Reading by question type</h3>
          </div>
          <div className="stack" style={{ gap: '0.45rem' }}>
            {report.questionTypes.map((r) => {
              const pct = r.total ? (r.correct / r.total) * 100 : 0;
              return (
                <div key={`${r.module}-${r.questionType}`} className="area-row" style={{ cursor: 'default' }}>
                  <span className="area-name">
                    <span className={`module-dot ${moduleClass(r.module as 'LISTENING')}`} />
                    {titleCase(r.questionType)}
                    <span className="small muted">{PAPER_NAMES[r.module]}</span>
                  </span>
                  <span className="area-meter">
                    <span style={{ width: `${pct}%`, background: heatStep(pct / 100) }} />
                  </span>
                  <span className="area-pct">
                    {r.correct}/{r.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            <h3>Writing & Speaking criteria</h3>
          </div>
          <table className="table criteria-table">
            <thead>
              <tr>
                <th>Criterion</th>
                {tasks.map(([task]) => (
                  <th key={task}>{task === 'TASK1' ? 'Task 1' : 'Task 2'}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.length > 0 &&
                Object.keys(tasks[0]![1]).map((c) => (
                  <tr key={c}>
                    <td>{criterionName(c)}</td>
                    {tasks.map(([task, crit]) => (
                      <td key={task}>
                        <span className="band-pill">{crit[c] ?? '—'}</span>
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
          <table className="table criteria-table" style={{ marginTop: '0.8rem' }}>
            <thead>
              <tr>
                <th>Speaking criterion</th>
                <th>Band</th>
              </tr>
            </thead>
            <tbody>
              {speaking.map(([c, v]) => (
                <tr key={c}>
                  <td>{criterionName(c)}</td>
                  <td>
                    {v > 0 ? (
                      <span className="band-pill">{v}</span>
                    ) : (
                      <span className="small muted">not assessed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
