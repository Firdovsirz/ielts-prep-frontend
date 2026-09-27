import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExamExit } from '../../components/ExamExit';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, Loading } from '../../components/ui';
import { Timer } from '../../components/Timer';
import { PassageText } from '../../components/passage/PassageText';
import { QuestionGroupView } from '../../components/questions/QuestionGroupView';
import { Navigator } from '../../components/questions/Navigator';
import { useCountdown } from '../../lib/useCountdown';
import { storage } from '../../lib/storage';

type Flag = Schemas['FlaggedWordRequest'];

export function ReadingSession() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ['reading', 'session', sessionId],
    queryFn: () => unwrap(api.GET('/api/reading/sessions/{id}', { params: { path: { id: sessionId } } })),
  });

  const draftKey = `reading.draft.${sessionId}`;
  const [answers, setAnswers] = useState<Record<number, string>>(() => storage.getJson(draftKey, {}));
  const [flags, setFlags] = useState<Flag[]>(() => storage.getJson(`${draftKey}.flags`, []));
  const [active, setActive] = useState(0);
  const secondsPerPassage = useRef<Record<number, number>>(storage.getJson(`${draftKey}.time`, {}));
  const questionsPane = useRef<HTMLDivElement>(null);

  useEffect(() => storage.setJson(draftKey, answers), [answers, draftKey]);
  useEffect(() => storage.setJson(`${draftKey}.flags`, flags), [flags, draftKey]);

  const data = session.data;
  const passage = data?.passages[active];
  const total = useMemo(
    () => (data ? data.passages.reduce((sum, p) => sum + p.questionCount, 0) : 0),
    [data],
  );
  const exam = data?.mode === 'EXAM';
  const { remaining } = useCountdown(
    data?.startedAt ?? null,
    data?.timeLimitSeconds ?? null,
    data?.status === 'IN_PROGRESS',
  );

  // time spent per passage (time-management stats)
  useEffect(() => {
    if (!passage) return;
    const t = window.setInterval(() => {
      const map = secondsPerPassage.current;
      map[passage.itemId] = (map[passage.itemId] ?? 0) + 1;
      storage.setJson(`${draftKey}.time`, map);
    }, 1000);
    return () => window.clearInterval(t);
  }, [passage, draftKey]);

  const submit = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/api/reading/sessions/{id}/submit', {
          params: { path: { id: sessionId } },
          body: {
            answers: Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim() !== '')),
            timeUsedSeconds:
              data?.timeLimitSeconds != null && remaining != null
                ? data.timeLimitSeconds - remaining
                : undefined,
            secondsPerPassage: secondsPerPassage.current,
            flaggedWords: flags,
          },
        }),
      ),
    onSuccess: (result) => {
      [draftKey, `${draftKey}.flags`, `${draftKey}.time`].forEach((k) => storage.remove(k));
      queryClient.setQueryData(['reading', 'result', sessionId], result);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(data?.mockTestId ? `/mock/${data.mockTestId}` : `/reading/result/${sessionId}`, {
        replace: true,
      });
    },
  });

  // exam mode: auto-submit when the clock reaches zero
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (exam && remaining != null && remaining <= 0 && !autoSubmitted.current && !submit.isPending) {
      autoSubmitted.current = true;
      submit.mutate();
    }
  }, [exam, remaining, submit]);

  useEffect(() => {
    if (data && data.status !== 'IN_PROGRESS')
      navigate(data?.mockTestId ? `/mock/${data.mockTestId}` : `/reading/result/${sessionId}`, {
        replace: true,
      });
  }, [data, navigate, sessionId]);

  const setAnswer = useCallback((n: number, v: string) => setAnswers((a) => ({ ...a, [n]: v })), []);

  function jump(n: number) {
    if (!data) return;
    const idx = data.passages.findIndex((p) => n > p.numberOffset && n <= p.numberOffset + p.questionCount);
    if (idx >= 0 && idx !== active) setActive(idx);
    window.setTimeout(
      () => document.getElementById(`q-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      50,
    );
  }

  function confirmSubmit() {
    const unanswered = total - Object.values(answers).filter((v) => v.trim()).length;
    const msg =
      unanswered > 0 ? `${unanswered} question(s) unanswered. Submit anyway?` : 'Submit your answers?';
    if (window.confirm(msg)) submit.mutate();
  }

  if (session.isLoading) return <Loading label="Loading test…" />;
  if (session.error || !data || !passage)
    return (
      <div className="page">
        <ErrorBox error={session.error ?? 'Session not found'} />
      </div>
    );

  return (
    <div className="exam-shell">
      <div className="exam-bar">
        <ExamExit to={data?.mockTestId ? `/mock/${data.mockTestId}` : '/reading'} />
        <span className="exam-brand">IELTS · Reading</span>
        <span className={`badge ${exam ? 'badge-accent' : 'badge-dark'}`}>
          {exam ? 'Exam mode' : 'Practice'}
        </span>
        <div className="exam-tabs">
          {data.passages.map((p, i) => (
            <button
              key={p.itemId}
              className={`exam-tab${i === active ? ' active' : ''}`}
              onClick={() => setActive(i)}
            >
              Passage {data.passages.length > 1 ? i + 1 : p.passage.difficulty}{' '}
              <small>
                {p.numberOffset + 1}–{p.numberOffset + p.questionCount}
              </small>
            </button>
          ))}
        </div>
        <span className="spacer" />
        <Timer remaining={remaining} />
        <button className="btn btn-light" onClick={confirmSubmit} disabled={submit.isPending}>
          {submit.isPending ? 'Marking…' : 'Submit'}
        </button>
      </div>
      <ErrorBox error={submit.error} title="Submit failed" />
      <div className="split">
        <div className="pane">
          <PassageText
            passage={passage.passage}
            onFlagWord={(word, sentence) =>
              setFlags((f) =>
                f.some((x) => x.word === word) ? f : [...f, { word, sentence, itemId: passage.itemId }],
              )
            }
          />
          {flags.length > 0 && (
            <div className="stack" style={{ marginTop: '1rem' }}>
              <span className="small muted">Flagged for your vocabulary deck:</span>
              <div className="row">
                {flags.map((f) => (
                  <span className="chip" key={f.word}>
                    {f.word}
                    <button
                      onClick={() => setFlags((all) => all.filter((x) => x.word !== f.word))}
                      aria-label={`Remove ${f.word}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {passage.sourceUrl && (
            <p className="small muted" style={{ marginTop: '1.5rem' }}>
              Original passage written for practice. Topic seed:{' '}
              <a href={passage.sourceUrl}>{passage.sourceUrl}</a> ({passage.licence})
            </p>
          )}
        </div>
        <div className="pane" ref={questionsPane}>
          {passage.passage.question_groups.map((g) => (
            <QuestionGroupView
              key={g.group_id}
              group={g}
              offset={passage.numberOffset}
              answers={answers}
              onAnswer={setAnswer}
            />
          ))}
          <hr className="divider" />
          <Navigator total={total} answers={answers} onJump={jump} />
        </div>
      </div>
    </div>
  );
}
