import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { downloadExport } from '../../lib/download';
import { ErrorBox, Loading, PageHeader, ProgressBar } from '../../components/ui';
import { Icon, ModuleIcon, type ModuleName } from '../../components/icons';
import { moduleClass } from '../../lib/modules';
import { formatBand, formatDate, formatMinutes, formatUsd, titleCase } from '../../lib/format';
import { heatClass, heatStep } from '../../lib/chartData';
import { BandHistoryChart, CriteriaChart } from './charts';

const MODULES: {
  key: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
  field: 'listening' | 'reading' | 'writing' | 'speaking';
  color: string;
}[] = [
  { key: 'LISTENING', field: 'listening', color: 'var(--m-listening)' },
  { key: 'READING', field: 'reading', color: 'var(--m-reading)' },
  { key: 'WRITING', field: 'writing', color: 'var(--m-writing)' },
  { key: 'SPEAKING', field: 'speaking', color: 'var(--m-speaking)' },
];

const TREND_BADGE: Record<string, string> = {
  NEW: 'badge-accent',
  WORSENING: 'badge-bad',
  IMPROVING: 'badge-good',
  STABLE: '',
  RESOLVED: 'badge-good',
};

export function DashboardPage() {
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => unwrap(api.GET('/api/dashboard')) });
  if (q.isLoading) return <Loading />;
  const d = q.data;
  if (!d) return <ErrorBox error={q.error} />;
  const target = d.targetBand;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Progress"
        title="Band history & weak spots"
        subtitle="Every attempt is a point. Filled dots are full tests, hollow dots are single-passage or single-task estimates; the line is your 7-attempt rolling average."
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

      <section className="band-strip">
        <div className="band-strip-overall">
          <div className="eyebrow">Estimated overall</div>
          <div className="band-strip-value">{formatBand(d.current.overall)}</div>
          <div className="small muted">
            {d.current.overall == null ? 'Needs all four modules' : `Target ${target.toFixed(1)}`}
          </div>
        </div>
        {MODULES.map((m) => {
          const band = d.current[m.field];
          const gap = band == null ? null : band - target;
          return (
            <div key={m.key} className={`band-strip-module ${moduleClass(m.key)}`}>
              <ModuleIcon module={m.key as ModuleName} size={18} />
              <div>
                <div className="small muted">{titleCase(m.key)}</div>
                <div className="band-strip-value sm">{formatBand(band)}</div>
                {gap != null && (
                  <div className={`small ${gap >= 0 ? 'text-good' : 'text-bad'}`}>
                    {gap >= 0 ? 'On target' : `${gap.toFixed(1)} to target`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <div className="grid grid-4" style={{ margin: '1.1rem 0' }}>
        <Stat
          icon="today"
          value={`${d.activity.streakDays}`}
          label="Day streak"
          hint={`Longest ${d.activity.longestStreak}`}
        />
        <Stat
          icon="history"
          value={formatMinutes(d.activity.totalMinutes * 60)}
          label="Practice time"
          hint={`${d.activity.sessionsCompleted} sessions`}
        />
        <Stat
          icon="progress"
          value={`${d.activity.itemsCompleted}`}
          label="Items completed"
          hint={d.daysToTest != null ? `${d.daysToTest} days to test` : undefined}
        />
        <Stat
          icon="coach"
          value={formatUsd(d.activity.apiSpendWeek)}
          label="API spend · 7 days"
          hint={`${formatUsd(d.activity.apiSpendToday)} today`}
        />
      </div>

      <ActivityStrip days={d.activity.last28Days} />

      <h2 className="section-title">Band over time</h2>
      <div className="grid grid-2">
        {MODULES.map((m) => {
          const points = d.bandHistory[m.key] ?? [];
          return (
            <div key={m.key} className={`card chart-card ${moduleClass(m.key)}`}>
              <div className="card-title">
                <h3 className="row" style={{ gap: '0.5rem' }}>
                  <ModuleIcon module={m.key as ModuleName} size={16} /> {titleCase(m.key)}
                </h3>
                <span className="small muted">
                  {points.length} attempt{points.length === 1 ? '' : 's'}
                </span>
              </div>
              {points.length === 0 ? (
                <EmptyChart module={m.key} />
              ) : (
                <BandHistoryChart points={points} target={target} color={m.color} />
              )}
            </div>
          );
        })}
      </div>

      <h2 className="section-title">Criterion trends</h2>
      <div className="grid grid-2">
        {(['WRITING', 'SPEAKING'] as const).map((m) => {
          const pts = d.criteriaHistory[m] ?? [];
          return (
            <div key={m} className="card">
              <div className="card-title">
                <h3>{titleCase(m)} criteria</h3>
                <span className="small muted">Spot the criterion that stalls</span>
              </div>
              {pts.length === 0 ? <EmptyChart module={m} /> : <CriteriaChart points={pts} />}
            </div>
          );
        })}
      </div>

      <div className="grid grid-2" style={{ marginTop: '1.1rem' }}>
        <div className="card">
          <div className="card-title">
            <h3>Question-type accuracy</h3>
            <span className="small muted">Weakest first · Reading & Listening</span>
          </div>
          <Heatmap rows={d.questionTypes} />
        </div>
        <div className="card">
          <div className="card-title">
            <h3>Top recurring errors</h3>
            <Link to="/grammar" className="btn btn-ghost btn-sm">
              Drill them
            </Link>
          </div>
          {d.topErrors.length === 0 ? (
            <p className="muted small">Graded Writing and Speaking will populate this.</p>
          ) : (
            <table className="table">
              <tbody>
                {d.topErrors.map((e) => (
                  <tr key={e.type + e.subtype}>
                    <td>
                      <strong>{titleCase(e.subtype)}</strong>
                      <div className="small muted">{e.type}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>×{e.total}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${TREND_BADGE[e.trend] ?? ''}`}>{e.trend}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: '1.1rem' }}>
        <div className="card">
          <h3>Time management</h3>
          <div className="stack">
            {d.timing.map((t) => (
              <div key={t.label}>
                <div className="row-between small">
                  <span>{t.label}</span>
                  <span className="muted">
                    {t.averageSeconds == null ? 'no data' : `avg ${formatMinutes(t.averageSeconds)}`}
                    {t.limitSeconds > 0 && ` / ${formatMinutes(t.limitSeconds)} limit`} · {t.count}
                  </span>
                </div>
                {t.limitSeconds > 0 && <ProgressBar value={t.averageSeconds ?? 0} max={t.limitSeconds} />}
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Blanks under time pressure</h3>
          <p className="small muted">
            Unanswered questions by position in exam-mode full tests — a rising last bar means you are running
            out of time.
          </p>
          {d.blanks.length === 0 ? (
            <p className="muted small">Take a full Reading or Listening test in exam mode.</p>
          ) : (
            <div className="stack" style={{ gap: '0.5rem' }}>
              {d.blanks.map((b) => (
                <div key={b.label}>
                  <div className="row-between small">
                    <span>{b.label}</span>
                    <span className="muted">
                      {b.blanks}/{b.questions} blank ({Math.round(b.blankRate * 100)}%)
                    </span>
                  </div>
                  <ProgressBar value={b.blanks} max={b.questions} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  hint,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="card stat-card">
      <span className="stat-icon">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {hint && <div className="small muted">{hint}</div>}
      </div>
    </div>
  );
}

function ActivityStrip({ days }: { days: Schemas['DayActivity'][] }) {
  const max = Math.max(30, ...days.map((d) => d.minutes));
  return (
    <div className="card activity-strip">
      <div className="card-title" style={{ marginBottom: '0.6rem' }}>
        <h3>Last 28 days</h3>
        <span className="small muted">minutes practised per day</span>
      </div>
      <div className="activity-cells">
        {days.map((d) => (
          <div
            key={d.date}
            className="activity-cell"
            title={`${formatDate(d.date)}: ${d.minutes} min, ${d.sessions} sessions`}
          >
            <span
              style={{
                height: `${Math.max(d.sessions > 0 ? 10 : 3, (d.minutes / max) * 100)}%`,
                background:
                  d.sessions > 0 ? heatStep(Math.min(1, d.minutes / max + 0.4)) : 'var(--surface-3)',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Heatmap({ rows }: { rows: Schemas['QuestionTypeAccuracy'][] }) {
  if (rows.length === 0)
    return (
      <p className="muted small">
        Complete Reading or Listening practice to see which question types cost you marks.
      </p>
    );
  return (
    <table className="table heatmap">
      <thead>
        <tr>
          <th>Question type</th>
          <th>Module</th>
          <th style={{ textAlign: 'center' }}>All-time</th>
          <th style={{ textAlign: 'center' }}>Last 30</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.module + r.questionType}>
            <td>{titleCase(r.questionType)}</td>
            <td className="small muted">{titleCase(r.module)}</td>
            <td>
              <div className={`heat-cell ${heatClass(r.accuracy)}`}>
                {Math.round(r.accuracy * 100)}%{' '}
                <span style={{ opacity: 0.75 }}>
                  ({r.correct}/{r.total})
                </span>
              </div>
            </td>
            <td>
              <div className={`heat-cell ${heatClass(r.recentAccuracy)}`}>
                {r.recentAccuracy == null ? '—' : `${Math.round(r.recentAccuracy * 100)}%`}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyChart({ module }: { module: string }) {
  const to = `/${module.toLowerCase()}`;
  return (
    <div className="empty-chart">
      <p className="muted small">No {titleCase(module)} attempts yet.</p>
      <Link to={to} className="btn btn-secondary btn-sm">
        Practise {titleCase(module)}
      </Link>
    </div>
  );
}
