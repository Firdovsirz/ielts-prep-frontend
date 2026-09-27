import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExamExit } from '../../components/ExamExit';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, Loading } from '../../components/ui';
import { Timer } from '../../components/Timer';
import { QuestionGroupView } from '../../components/questions/QuestionGroupView';
import { Navigator } from '../../components/questions/Navigator';
import { storage } from '../../lib/storage';
import { assignVoices, narratorVoice } from '../../lib/voices';
import { loadVoices, SpeechRunner, speechSupported, type SpeechLine } from '../../lib/speech';
import { useNow } from '../../lib/useCountdown';

type SectionView = Schemas['ListeningSectionView'];

type Phase =
  | { kind: 'ready' }
  | { kind: 'intro'; section: number }
  | { kind: 'reading'; section: number; part: number; until: number }
  | { kind: 'playing'; section: number; part: number; line: number }
  | { kind: 'between'; section: number }
  | { kind: 'transfer'; until: number }
  | { kind: 'idle'; section: number };

export function ListeningSession() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ['listening', 'session', sessionId],
    queryFn: () => unwrap(api.GET('/api/listening/sessions/{id}', { params: { path: { id: sessionId } } })),
  });
  const key = `listening.draft.${sessionId}`;
  const [answers, setAnswers] = useState<Record<number, string>>(() => storage.getJson(key, {}));
  const [phase, setPhase] = useState<Phase>(() => {
    const transferUntil = storage.getJson<number | null>(`${key}.transfer`, null);
    return transferUntil ? { kind: 'transfer', until: transferUntil } : { kind: 'ready' };
  });
  const [viewSection, setViewSection] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replays, setReplays] = useState<Record<number, number>>(() => storage.getJson(`${key}.replays`, {}));
  const runner = useRef<SpeechRunner | null>(null);
  const voices = useRef<SpeechSynthesisVoice[]>([]);
  const startedAt = useRef<number>(0);
  const data = session.data;
  const exam = data?.mode === 'EXAM';
  const sections = useMemo(() => data?.sections ?? [], [data]);
  const total = sections.reduce((n, s) => n + s.questionCount, 0);
  const now = useNow(500, phase.kind === 'reading' || phase.kind === 'transfer');

  useEffect(() => storage.setJson(key, answers), [answers, key]);
  useEffect(() => storage.setJson(`${key}.replays`, replays), [replays, key]);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  useEffect(() => {
    loadVoices().then((v) => (voices.current = v));
    return () => runner.current?.stop();
  }, []);
  useEffect(() => {
    if (data && data.status !== 'IN_PROGRESS')
      navigate(data?.mockTestId ? `/mock/${data.mockTestId}` : `/listening/result/${sessionId}`, {
        replace: true,
      });
  }, [data, navigate, sessionId]);

  /** Moves the player to a new phase and shows that part's questions. */
  const enter = useCallback((next: Phase) => {
    setPhase(next);
    if ('section' in next) setViewSection(next.section);
  }, []);

  const setAnswer = useCallback((n: number, v: string) => setAnswers((a) => ({ ...a, [n]: v })), []);

  const submit = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/api/listening/sessions/{id}/submit', {
          params: { path: { id: sessionId } },
          body: {
            answers: Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim() !== '')),
            timeUsedSeconds: Math.round((Date.now() - startedAt.current) / 1000),
            replaysPerSection: replays,
          },
        }),
      ),
    onSuccess: (result) => {
      runner.current?.stop();
      [key, `${key}.transfer`, `${key}.replays`, `${key}.progress`].forEach((k) => storage.remove(k));
      queryClient.setQueryData(['listening', 'result', sessionId], result);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(data?.mockTestId ? `/mock/${data.mockTestId}` : `/listening/result/${sessionId}`, {
        replace: true,
      });
    },
  });

  // exam: submit automatically when transfer time runs out
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (
      phase.kind === 'transfer' &&
      now >= phase.until &&
      exam &&
      !autoSubmitted.current &&
      !submit.isPending
    ) {
      autoSubmitted.current = true;
      submit.mutate();
    }
  }, [phase, now, exam, submit]);

  function speechLines(section: SectionView, from: number, to: number): SpeechLine[] {
    const plan = assignVoices(section.section.speakers, voices.current);
    return section.section.script.slice(from, to).map((l) => {
      const p = plan[l.speaker];
      return {
        text: l.text,
        voice: (p?.voice as SpeechSynthesisVoice | null) ?? null,
        pitch: p?.pitch ?? 1,
        lang: p?.lang ?? 'en-GB',
      };
    });
  }

  function narration(text: string): SpeechLine[] {
    const v = narratorVoice(voices.current) as SpeechSynthesisVoice | null;
    return [{ text, voice: v, pitch: 1, lang: v?.lang ?? 'en-GB' }];
  }

  /** Plays one section: intro, then reading time + audio for each part (from `fromPart`). */
  async function playSection(
    r: SpeechRunner,
    idx: number,
    fromPart: number,
    withReading: boolean,
  ): Promise<boolean> {
    if (!data) return false;
    const sec = sections[idx]!;
    const s = sec.section;
    const readingSeconds = data.readingSeconds;
    if (fromPart === 0) {
      enter({ kind: 'intro', section: idx });
      if ((await r.speak(narration(`Part ${s.section}. ${s.context_description}`))) === 'stopped')
        return false;
    }
    for (let p = fromPart; p < s.parts.length; p++) {
      const part = s.parts[p]!;
      const next = s.parts[p + 1];
      if (withReading) {
        enter({ kind: 'reading', section: idx, part: p, until: Date.now() + readingSeconds * 1000 });
        const say = `You now have some time to look at questions ${part.questions_from + sec.numberOffset} to ${part.questions_to + sec.numberOffset}.`;
        if ((await r.speak(narration(say))) === 'stopped') return false;
        if ((await r.wait(readingSeconds * 1000)) === 'stopped') return false;
      }
      enter({ kind: 'playing', section: idx, part: p, line: part.start_line });
      const lines = speechLines(sec, part.start_line, next ? next.start_line : s.script.length);
      const res = await r.speak(lines, (i) =>
        enter({ kind: 'playing', section: idx, part: p, line: part.start_line + i }),
      );
      if (res === 'stopped') return false;
      storage.setJson(`${key}.progress`, { section: idx, part: p + 1 });
    }
    return true;
  }

  async function runExam() {
    runner.current?.stop();
    const r = new SpeechRunner(data?.speechRate ?? 1);
    runner.current = r;
    startedAt.current = Date.now();
    const resume = storage.getJson<{ section: number; part: number } | null>(`${key}.progress`, null);
    for (let i = resume?.section ?? 0; i < sections.length; i++) {
      const fromPart =
        resume && i === resume.section ? Math.min(resume.part, sections[i]!.section.parts.length) : 0;
      if (!(await playSection(r, i, fromPart, true))) return;
      enter({ kind: 'between', section: i });
      await r.speak(narration(`That is the end of Part ${sections[i]!.section.section}.`));
      storage.setJson(`${key}.progress`, { section: i + 1, part: 0 });
    }
    const until = Date.now() + (data?.transferMinutes ?? 10) * 60_000;
    storage.setJson(`${key}.transfer`, until);
    enter({ kind: 'transfer', until });
    await r.speak(
      narration(
        `That is the end of the listening test. You now have ${data?.transferMinutes ?? 10} minutes to check and complete your answers.`,
      ),
    );
  }

  async function practicePlay(idx: number, fromPart: number, withReading: boolean) {
    runner.current?.stop();
    const r = new SpeechRunner(data?.speechRate ?? 1);
    runner.current = r;
    setPaused(false);
    const itemId = sections[idx]!.itemId;
    setReplays((r) => ({ ...r, [itemId]: (r[itemId] ?? 0) + 1 }));
    if (await playSection(r, idx, fromPart, withReading)) enter({ kind: 'idle', section: idx });
  }

  function togglePause() {
    if (!runner.current) return;
    if (paused) runner.current.resume();
    else runner.current.pause();
    setPaused(!paused);
  }

  if (session.isLoading) return <Loading label="Loading recording…" />;
  if (session.error || !data)
    return (
      <div className="page">
        <ErrorBox error={session.error ?? 'Session not found'} />
      </div>
    );

  const shown = sections[viewSection]!;
  const current = 'section' in phase ? sections[phase.section] : undefined;
  const speakerId = phase.kind === 'playing' ? current?.section.script[phase.line]?.speaker : undefined;
  const speaker = current?.section.speakers.find((s) => s.id === speakerId);
  const remaining =
    phase.kind === 'reading' || phase.kind === 'transfer'
      ? Math.max(0, Math.round((phase.until - now) / 1000))
      : null;
  const running =
    phase.kind === 'intro' ||
    phase.kind === 'reading' ||
    phase.kind === 'playing' ||
    phase.kind === 'between';

  return (
    <div className="exam-shell">
      <div className="exam-bar">
        <ExamExit to={data?.mockTestId ? `/mock/${data.mockTestId}` : '/listening'} />
        <span className="exam-brand">IELTS · Listening</span>
        <span className={`badge ${exam ? 'badge-accent' : 'badge-dark'}`}>
          {exam ? 'Exam mode' : 'Practice'}
        </span>
        <div className="exam-tabs">
          {sections.map((s, i) => (
            <button
              key={s.itemId}
              className={`exam-tab${i === viewSection ? ' active' : ''}`}
              onClick={() => setViewSection(i)}
            >
              Part {s.section.section}{' '}
              <small>
                {s.numberOffset + 1}–{s.numberOffset + s.questionCount}
              </small>
            </button>
          ))}
        </div>
        <span className="spacer" />
        {phase.kind === 'transfer' && <Timer remaining={remaining} label="Transfer time" />}
        <button
          className="btn btn-light"
          disabled={submit.isPending || (exam && running)}
          onClick={() => window.confirm('Submit your answers?') && submit.mutate()}
        >
          {submit.isPending ? 'Marking…' : 'Submit'}
        </button>
      </div>
      <ErrorBox error={submit.error} title="Submit failed" />

      <div className="listening-layout">
        <aside className="player-card">
          <div className={`equaliser${phase.kind === 'playing' && !paused ? ' on' : ''}`} aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
          <div className="player-status">
            {phase.kind === 'ready' && <strong>Ready when you are</strong>}
            {phase.kind === 'intro' && <strong>Part {current?.section.section} — introduction</strong>}
            {phase.kind === 'reading' && (
              <>
                <strong>Reading time</strong>
                <span className="player-count">{remaining}s</span>
              </>
            )}
            {phase.kind === 'playing' && (
              <>
                <strong>Part {current?.section.section} · playing</strong>
                <span className="small muted">{speaker ? `${speaker.name} — ${speaker.role}` : ''}</span>
              </>
            )}
            {phase.kind === 'between' && <strong>End of Part {current?.section.section}</strong>}
            {phase.kind === 'idle' && <strong>Part {current?.section.section} finished</strong>}
            {phase.kind === 'transfer' && <strong>Check and transfer your answers</strong>}
          </div>
          {!speechSupported() && (
            <div className="alert alert-warn small">No speech synthesis in this browser.</div>
          )}
          {exam ? (
            phase.kind === 'ready' && (
              <button className="btn btn-lg" onClick={runExam}>
                ▶ Start the recording
              </button>
            )
          ) : (
            <div className="stack" style={{ gap: '0.5rem' }}>
              <button className="btn" onClick={() => practicePlay(viewSection, 0, true)}>
                ▶ Play Part {shown.section.section} with reading time
              </button>
              <div className="row">
                {shown.section.parts.map((p, i) => (
                  <button
                    key={i}
                    className="btn btn-secondary btn-sm"
                    onClick={() => practicePlay(viewSection, i, false)}
                  >
                    Replay Q{p.questions_from + shown.numberOffset}–{p.questions_to + shown.numberOffset}
                  </button>
                ))}
              </div>
              <div className="row">
                <button className="btn btn-secondary btn-sm" onClick={togglePause} disabled={!running}>
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    runner.current?.stop();
                    enter({ kind: 'idle', section: viewSection });
                  }}
                  disabled={!running}
                >
                  Stop
                </button>
              </div>
              <span className="small muted">Played {replays[shown.itemId] ?? 0}× · replays are recorded</span>
            </div>
          )}
          <p className="small muted" style={{ marginTop: '0.75rem' }}>
            {shown.section.context_description}
          </p>
          <hr className="divider" />
          <Navigator
            total={total}
            answers={answers}
            onJump={(n) => {
              const idx = sections.findIndex(
                (s) => n > s.numberOffset && n <= s.numberOffset + s.questionCount,
              );
              if (idx >= 0) setViewSection(idx);
              window.setTimeout(
                () =>
                  document.getElementById(`q-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
                50,
              );
            }}
          />
        </aside>
        <main className="listening-questions">
          <div className="eyebrow">
            Part {shown.section.section} · Questions {shown.numberOffset + 1}–
            {shown.numberOffset + shown.questionCount}
          </div>
          {shown.section.question_groups.map((g) => (
            <QuestionGroupView
              key={g.group_id}
              group={g}
              offset={shown.numberOffset}
              answers={answers}
              onAnswer={setAnswer}
            />
          ))}
        </main>
      </div>
    </div>
  );
}
