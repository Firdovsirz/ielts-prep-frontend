import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, type Schemas } from '../../api/client';
import { Empty, ErrorBox, Loading, PageHeader } from '../../components/ui';
import { Icon, ModuleIcon } from '../../components/icons';
import { formatBand, formatDate, titleCase } from '../../lib/format';
import { asModule } from '../../lib/planActions';
import { moduleClass } from '../../lib/modules';

type Report = Schemas['CoachReportView'];
const SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const;

export function CoachPage() {
  const qc = useQueryClient();
  const reports = useQuery({ queryKey: ['coach'], queryFn: () => unwrap(api.GET('/api/coach/reports')) });
  const [selected, setSelected] = useState<number | null>(null);
  const write = useMutation({
    mutationFn: () => unwrap(api.POST('/api/coach/reports')),
    onSuccess: (r) => {
      setSelected(r.id);
      qc.invalidateQueries({ queryKey: ['coach'] });
    },
  });

  if (reports.isLoading) return <Loading />;
  const list = reports.data ?? [];
  const current = list.find((r) => r.id === selected) ?? list[0];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Weekly coach"
        title="Coach reports"
        subtitle="Every Monday morning your coach reviews the week — scores, recurring errors, plan completion — and re-plans the next seven days."
        icon={
          <span className="module-icon plan-general">
            <Icon name="coach" size={28} strokeWidth={2} />
          </span>
        }
        actions={
          <button className="btn" onClick={() => write.mutate()} disabled={write.isPending}>
            {write.isPending ? 'Your coach is writing… (~30 s)' : "Write this week's report"}
          </button>
        }
      />
      <ErrorBox error={reports.error ?? write.error} />
      {!current ? (
        <div className="card">
          <Empty>
            No reports yet. The first one arrives on Monday at 07:00 — or write one now for the last seven
            days.
          </Empty>
        </div>
      ) : (
        <div className="coach-layout">
          <ReportView report={current} />
          {list.length > 1 && (
            <aside className="card coach-history">
              <h3>Past reports</h3>
              {list.map((r) => (
                <button
                  key={r.id}
                  className={`coach-history-item${r.id === current.id ? ' active' : ''}`}
                  onClick={() => setSelected(r.id)}
                >
                  <strong>
                    {formatDate(r.weekStart)} – {formatDate(r.weekEnd)}
                  </strong>
                  <span className="small muted truncate">{r.content.headline}</span>
                </button>
              ))}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function ReportView({ report }: { report: Report }) {
  const c = report.content;
  const s = report.stats;
  return (
    <article className="coach-report">
      <section className="coach-hero">
        <div className="eyebrow">
          {formatDate(report.weekStart)} – {formatDate(report.weekEnd)} ·{' '}
          {report.generatedBy === 'AI' ? '✦ written by your AI coach' : 'rule-based report (no API key)'}
        </div>
        <h2>{c.headline}</h2>
        <p>{c.summary}</p>
        {s && (
          <div className="coach-stats">
            <Stat value={s.sessions} label="sessions" />
            <Stat value={s.minutes} label="minutes" />
            <Stat value={`${s.activeDays}/7`} label="active days" />
            <Stat value={`${Math.round(s.plan.completion * 100)}%`} label="plan done" />
            <Stat value={s.vocab.reviews} label="cards reviewed" />
            <Stat value={s.errorsResolved} label="errors resolved" />
          </div>
        )}
      </section>

      <div className="card coach-outlook">
        <div className="eyebrow">Band outlook</div>
        <p>{c.band_outlook}</p>
        {s && (
          <div className="coach-bands">
            {SKILLS.map((m) => {
              const w = s.modules[m];
              const current =
                s.currentBands[m.toLowerCase() as 'listening' | 'reading' | 'writing' | 'speaking'];
              return (
                <div key={m} className={`coach-band ${moduleClass(m)}`}>
                  <ModuleIcon module={m} size={16} />
                  <div>
                    <strong>{titleCase(m)}</strong>
                    <span className="small muted">
                      {w?.sessions
                        ? `${w.sessions} sessions · avg ${formatBand(w.averageBand)}`
                        : 'not practised this week'}
                    </span>
                  </div>
                  <span className="band-pill">{formatBand(current)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 className="coach-list-title good">What went well</h3>
          <ul className="coach-list good">
            {c.wins.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3 className="coach-list-title warn">Watch out for</h3>
          <ul className="coach-list warn">
            {c.concerns.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className="section-title">Priorities for next week</h3>
      <div className="grid grid-3">
        {c.priorities.map((p, i) => {
          const m = asModule(p.module);
          return (
            <div key={i} className={`card coach-priority ${m ? moduleClass(m) : ''}`}>
              <div className="row-between">
                <span className="priority-num">{i + 1}</span>
                {m && <ModuleIcon module={m} size={16} />}
              </div>
              <h4>{p.title}</h4>
              <p className="small">{p.detail}</p>
            </div>
          );
        })}
      </div>

      <blockquote className="coach-quote">{c.encouragement}</blockquote>
    </article>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="coach-stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}
