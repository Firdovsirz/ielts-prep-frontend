import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { ErrorBox } from '../../components/ui';
import { PlanTaskRow } from './PlanTaskRow';
import { useStartTask } from './useStartTask';

/** Today's tasks with checkboxes, for the home page. */
export function TodayPlan() {
  const plan = useQuery({ queryKey: ['plan'], queryFn: () => unwrap(api.GET('/api/plan')) });
  const start = useStartTask();
  const today = plan.data?.days[0];
  const done = today?.tasks.filter((t) => t.done).length ?? 0;
  const total = today?.tasks.length ?? 0;
  const pct = today?.minutesPlanned ? Math.round((today.minutesDone / today.minutesPlanned) * 100) : 0;

  return (
    <section className="card today-plan">
      <div className="card-title">
        <div>
          <div className="eyebrow">{plan.data?.phaseLabel ?? 'Study plan'} phase</div>
          <h2 style={{ margin: 0 }}>Today&apos;s plan</h2>
        </div>
        <div className="row">
          <div
            className="today-ring"
            style={{ ['--pct' as string]: `${pct}%` }}
            title={`${pct}% of today's minutes done`}
          >
            <span>
              {done}/{total}
            </span>
          </div>
          <Link className="btn btn-ghost btn-sm" to="/plan">
            Full week →
          </Link>
        </div>
      </div>
      <ErrorBox error={plan.error ?? start.error} />
      {plan.isLoading && <div className="muted small">Planning your day…</div>}
      {today?.tasks.map((t) => (
        <PlanTaskRow key={t.id} task={t} onStart={(task) => start.mutate(task)} starting={start.isPending} />
      ))}
      {today && total > 0 && done === total && (
        <div className="alert alert-good small" style={{ marginTop: '0.6rem' }}>
          Everything on today&apos;s plan is done — excellent work.
        </div>
      )}
    </section>
  );
}
