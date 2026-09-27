import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, type Schemas } from '../../api/client';
import { Icon, ModuleIcon } from '../../components/icons';
import { asModule, CTA } from '../../lib/planActions';
import { moduleClass } from '../../lib/modules';

type Task = Schemas['PlanTaskView'];

export function PlanTaskRow({
  task,
  onStart,
  starting,
  compact,
}: {
  task: Task;
  onStart: (t: Task) => void;
  starting: boolean;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (done: boolean) =>
      unwrap(api.POST('/api/plan/tasks/{id}/toggle', { params: { path: { id: task.id } }, body: { done } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan'] }),
  });
  const module = asModule(task.module);
  const done = toggle.isPending ? !task.done : task.done;
  const cta = CTA[task.action];

  return (
    <div
      className={`plan-task${done ? ' done' : ''}${compact ? ' compact' : ''} ${module ? moduleClass(module) : ''}`}
    >
      <button
        className="plan-check"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        onClick={() => toggle.mutate(!task.done)}
        disabled={toggle.isPending || task.action === 'REST'}
      >
        {done && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2">
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="plan-task-icon">
        {module ? (
          <ModuleIcon module={module} size={compact ? 16 : 18} />
        ) : (
          <span className="module-icon plan-general">
            <Icon
              name={task.module === 'MOCK' ? 'mock' : task.action === 'REST' ? 'today' : 'coach'}
              size={compact ? 16 : 18}
            />
          </span>
        )}
      </div>
      <div className="plan-task-body">
        <div className="plan-task-title">{task.title}</div>
        {task.details && <div className="plan-task-why">{task.details}</div>}
      </div>
      <div className="plan-task-side">
        {task.minutes > 0 && <span className="plan-minutes">{task.minutes} min</span>}
        {cta && !done && (
          <button className="btn btn-sm btn-secondary" onClick={() => onStart(task)} disabled={starting}>
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}
