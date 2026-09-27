import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, Loading } from '../../components/ui';
import { Timer } from '../../components/Timer';
import { Task1Figure } from '../../components/figures/Task1Figure';
import { useCountdown } from '../../lib/useCountdown';
import { storage } from '../../lib/storage';
import { countWords, wordStatus } from '../../lib/wordCount';

type TaskView = Schemas['WritingTaskView'];

export function TaskPrompt({ task }: { task: TaskView }) {
  if (task.task1Academic) {
    return (
      <div className="stack">
        <p className="prompt-text">{task.task1Academic.prompt}</p>
        <Task1Figure task={task.task1Academic} />
      </div>
    );
  }
  if (task.task1General) return <p className="prompt-text">{task.task1General.prompt}</p>;
  if (task.task2) return <p className="prompt-text">{task.task2.prompt}</p>;
  return null;
}

export function WritingSession() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ['writing', 'session', sessionId],
    queryFn: () => unwrap(api.GET('/api/writing/sessions/{id}', { params: { path: { id: sessionId } } })),
  });
  const draftKey = `writing.draft.${sessionId}`;
  const [texts, setTexts] = useState<Record<number, string>>(() => storage.getJson(draftKey, {}));
  const [active, setActive] = useState(0);
  const seconds = useRef<Record<number, number>>(storage.getJson(`${draftKey}.time`, {}));
  const data = session.data;
  const task = data?.tasks[active];
  const exam = data?.mode === 'EXAM';
  const { remaining } = useCountdown(
    data?.startedAt ?? null,
    data?.timeLimitSeconds ?? null,
    data?.status === 'IN_PROGRESS',
  );

  useEffect(() => storage.setJson(draftKey, texts), [texts, draftKey]);
  useEffect(() => {
    if (!task) return;
    const t = window.setInterval(() => {
      seconds.current[task.itemId] = (seconds.current[task.itemId] ?? 0) + 1;
      storage.setJson(`${draftKey}.time`, seconds.current);
    }, 1000);
    return () => window.clearInterval(t);
  }, [task, draftKey]);
  useEffect(() => {
    if (data && data.status !== 'IN_PROGRESS') navigate(`/writing/result/${sessionId}`, { replace: true });
  }, [data, navigate, sessionId]);

  const submit = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/api/writing/sessions/{id}/submit', {
          params: { path: { id: sessionId } },
          body: {
            responses: (data?.tasks ?? []).map((t) => ({
              itemId: t.itemId,
              text: texts[t.itemId] ?? '',
              secondsSpent: seconds.current[t.itemId],
            })),
            timeUsedSeconds:
              data?.timeLimitSeconds != null && remaining != null
                ? data.timeLimitSeconds - remaining
                : undefined,
          },
        }),
      ),
    onSuccess: (result) => {
      storage.remove(draftKey);
      storage.remove(`${draftKey}.time`);
      queryClient.setQueryData(['writing', 'result', sessionId], result);
      navigate(`/writing/result/${sessionId}`, { replace: true });
    },
  });

  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (exam && remaining != null && remaining <= 0 && !autoSubmitted.current && !submit.isPending) {
      autoSubmitted.current = true;
      submit.mutate();
    }
  }, [exam, remaining, submit]);

  if (session.isLoading) return <Loading label="Loading task…" />;
  if (session.error || !data || !task)
    return (
      <div className="page">
        <ErrorBox error={session.error ?? 'Session not found'} />
      </div>
    );

  const text = texts[task.itemId] ?? '';
  const words = countWords(text);
  const status = wordStatus(words, task.minWords);
  const locked = submit.isPending || submit.isSuccess;

  return (
    <div className="exam-shell">
      <div className="exam-bar">
        <span className="exam-brand">IELTS · Writing</span>
        <span className={`badge ${exam ? 'badge-accent' : 'badge-primary'}`}>
          {exam ? 'Exam mode' : 'Practice'}
        </span>
        {data.tasks.length > 1 && (
          <div className="exam-tabs">
            {data.tasks.map((t, i) => (
              <button
                key={t.itemId}
                className={`exam-tab${i === active ? ' active' : ''}`}
                onClick={() => setActive(i)}
              >
                Task {t.task}
              </button>
            ))}
          </div>
        )}
        <span className="spacer" />
        <Timer remaining={remaining} />
        <button
          className="btn btn-light"
          disabled={locked}
          onClick={() => window.confirm('Submit and lock your writing for grading?') && submit.mutate()}
        >
          {submit.isPending ? 'Submitting…' : 'Submit'}
        </button>
      </div>
      <ErrorBox error={submit.error} title="Submit failed" />
      <div className="split">
        <div className="pane">
          <div className="eyebrow">
            Writing Task {task.task} · spend about {task.minutes} minutes
          </div>
          <TaskPrompt task={task} />
          <p className="small muted" style={{ marginTop: '1rem' }}>
            Write at least {task.minWords} words.
          </p>
        </div>
        <div className="pane">
          <textarea
            className="editor"
            value={text}
            readOnly={locked}
            spellCheck={false}
            placeholder="Start writing here… (spell-check is off, as in the computer-delivered test)"
            onChange={(e) => setTexts((t) => ({ ...t, [task.itemId]: e.target.value }))}
            aria-label={`Task ${task.task} response`}
          />
          <div className="row-between" style={{ marginTop: '0.5rem' }}>
            <span className={`word-count ${status}`}>
              {words} words {status === 'under' ? `· ${task.minWords - words} to go` : '✓'}
            </span>
            <span className="small muted">Autosaved in this browser</span>
          </div>
        </div>
      </div>
    </div>
  );
}
