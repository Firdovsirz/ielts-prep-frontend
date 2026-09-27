import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { ErrorBox, Loading, PageHeader } from '../../components/ui';
import { Icon } from '../../components/icons';
import { formatDateTime } from '../../lib/format';
import { PHASES, shortDate, weekdayLabel } from '../../lib/planActions';
import { PlanTaskRow } from './PlanTaskRow';
import { useStartTask } from './useStartTask';

export function PlanPage() {
  const qc = useQueryClient();
  const plan = useQuery({ queryKey: ['plan'], queryFn: () => unwrap(api.GET('/api/plan')) });
  const start = useStartTask();
  const rebuild = useMutation({
    mutationFn: (ai: boolean) => unwrap(api.POST('/api/plan/regenerate', { params: { query: { ai } } })),
    onSuccess: (p) => qc.setQueryData(['plan'], p),
  });

  if (plan.isLoading) return <Loading />;
  const p = plan.data;
  if (!p) return <ErrorBox error={plan.error} />;
  const phaseIndex = PHASES.findIndex((x) => x.key === p.phase);
  const week = p.days.reduce(
    (acc, d) => ({ planned: acc.planned + d.minutesPlanned, done: acc.done + d.minutesDone }),
    { planned: 0, done: 0 },
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow="Study plan"
        title="Your next seven days"
        subtitle={
          p.daysToTest != null && p.daysToTest >= 0
            ? `${p.daysToTest} days until your test on ${shortDate(p.testDate!)} — the plan adapts to every result you log.`
            : 'Set your test date in Settings and the plan will count down to it.'
        }
        icon={
          <span className="module-icon plan-general">
            <Icon name="plan" size={28} strokeWidth={2} />
          </span>
        }
        actions={
          <>
            {p.aiAvailable && (
              <button className="btn" onClick={() => rebuild.mutate(true)} disabled={rebuild.isPending}>
                {rebuild.isPending && rebuild.variables ? 'Personalising… (~30 s)' : '✦ Personalise with AI'}
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => rebuild.mutate(false)}
              disabled={rebuild.isPending}
            >
              Rebuild from latest results
            </button>
          </>
        }
      />
      <ErrorBox error={rebuild.error ?? start.error} />

      <section className="plan-hero">
        <div className="phase-steps" aria-label="Preparation phase">
          {PHASES.map((ph, i) => (
            <div
              key={ph.key}
              className={`phase-step${i === phaseIndex ? ' current' : ''}${phaseIndex > i ? ' past' : ''}`}
            >
              <span className="phase-dot">{phaseIndex > i ? '✓' : i + 1}</span>
              <span>
                <strong>{ph.label}</strong>
                <small>{ph.hint}</small>
              </span>
            </div>
          ))}
        </div>
        <p className="plan-focus">{p.focus}</p>
        <div className="row small plan-meta">
          <span className={`badge ${p.source === 'AI' ? 'badge-accent' : ''}`}>
            {p.source === 'AI' ? '✦ Personalised by your AI coach' : 'Rule-based plan'}
          </span>
          {p.generatedAt && <span>Updated {formatDateTime(p.generatedAt)}</span>}
          <span>
            {Math.round(week.done)} of {week.planned} minutes done this week
          </span>
          <Link to="/coach">Weekly coach report →</Link>
        </div>
      </section>

      <div className="plan-days">
        {p.days.map((d) => {
          const pct = d.minutesPlanned ? Math.round((d.minutesDone / d.minutesPlanned) * 100) : 0;
          const doneCount = d.tasks.filter((t) => t.done).length;
          return (
            <section
              key={d.date}
              className={`card plan-day${d.today ? ' today' : ''}${d.testDay ? ' test-day' : ''}`}
            >
              <header className="plan-day-head">
                <div>
                  <h2>{weekdayLabel(d.date, d.today)}</h2>
                  <span className="small muted">
                    {shortDate(d.date)}
                    {d.testDay && ' · test day'}
                  </span>
                </div>
                <div className="plan-day-progress" title={`${d.minutesDone} of ${d.minutesPlanned} minutes`}>
                  <span className="small muted">
                    {doneCount}/{d.tasks.length} · {d.minutesPlanned} min
                  </span>
                  <div className="progress" style={{ width: 90 }}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </header>
              <div>
                {d.tasks.map((t) => (
                  <PlanTaskRow
                    key={t.id}
                    task={t}
                    onStart={(task) => start.mutate(task)}
                    starting={start.isPending}
                    compact={!d.today}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
