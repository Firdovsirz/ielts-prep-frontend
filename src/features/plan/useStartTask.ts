import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { taskRoute } from '../../lib/planActions';

type Task = Schemas['PlanTaskView'];

/** Starts the practice a plan task describes (creating the session where needed) and opens it. */
export function useStartTask() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (task: Task): Promise<string> => {
      const direct = taskRoute(task.action, task.variant);
      if (direct) return direct;
      const v = task.variant;
      switch (task.action) {
        case 'READING_PASSAGE': {
          const s = await unwrap(
            api.POST('/api/reading/sessions', {
              body: { mode: 'PRACTICE', scope: 'PASSAGE', difficulty: Number(v ?? 3) },
            }),
          );
          return `/reading/session/${s.sessionId}`;
        }
        case 'READING_TEST': {
          const s = await unwrap(
            api.POST('/api/reading/sessions', { body: { mode: 'EXAM', scope: 'TEST' } }),
          );
          return `/reading/session/${s.sessionId}`;
        }
        case 'LISTENING_SECTION': {
          const s = await unwrap(
            api.POST('/api/listening/sessions', {
              body: { mode: 'PRACTICE', scope: 'SECTION', section: Number(v ?? 4) },
            }),
          );
          return `/listening/session/${s.sessionId}`;
        }
        case 'LISTENING_TEST': {
          const s = await unwrap(
            api.POST('/api/listening/sessions', { body: { mode: 'EXAM', scope: 'TEST' } }),
          );
          return `/listening/session/${s.sessionId}`;
        }
        case 'WRITING_TASK1':
        case 'WRITING_TASK2':
        case 'WRITING_TEST': {
          const scope =
            task.action === 'WRITING_TASK1' ? 'TASK1' : task.action === 'WRITING_TASK2' ? 'TASK2' : 'TEST';
          const s = await unwrap(
            api.POST('/api/writing/sessions', {
              body: { mode: task.action === 'WRITING_TEST' ? 'EXAM' : 'PRACTICE', scope },
            }),
          );
          return `/writing/session/${s.sessionId}`;
        }
        case 'SPEAKING_PART':
        case 'SPEAKING_TEST': {
          const scope =
            task.action === 'SPEAKING_TEST' ? 'TEST' : ((v ?? 'PART2') as 'PART1' | 'PART2' | 'PART3');
          const s = await unwrap(
            api.POST('/api/speaking/sessions', {
              body: {
                mode: task.action === 'SPEAKING_TEST' ? 'EXAM' : 'PRACTICE',
                scope,
                conversational: true,
              },
            }),
          );
          return `/speaking/session/${s.sessionId}`;
        }
        case 'GRAMMAR_DIAGNOSTIC': {
          const d = await unwrap(api.POST('/api/grammar/diagnostic'));
          return `/grammar/diagnostic/${d.diagnosticId}`;
        }
        case 'GRAMMAR_ERRORS': {
          const s = await unwrap(
            api.POST('/api/grammar/error-practice/{subtype}/start', {
              params: { path: { subtype: v ?? '' } },
            }),
          );
          return `/grammar/session/${s.sessionId}`;
        }
        default:
          return '/';
      }
    },
    onSuccess: (to) => navigate(to),
  });
}
