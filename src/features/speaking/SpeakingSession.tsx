import { useCallback, useEffect, useRef, useState } from 'react';
import { ExamExit } from '../../components/ExamExit';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api, authFetch, errorMessage, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, Loading } from '../../components/ui';
import { Timer } from '../../components/Timer';
import { AnswerRecorder, recognitionSupported, type Recording } from '../../lib/recorder';
import { loadVoices, SpeechRunner } from '../../lib/speech';
import { narratorVoice } from '../../lib/voices';
import { useNow } from '../../lib/useCountdown';

type Turn = Schemas['ExaminerTurn'];
type Stage = 'ready' | 'examiner' | 'prep' | 'answer' | 'review' | 'sending' | 'finishing';

const TALK_CUE =
  "All right? Remember you have one to two minutes for this, so don't worry if I stop you. I'll tell you when the time is up. Can you start speaking now, please?";

export function SpeakingSession() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ['speaking', 'session', sessionId],
    queryFn: () => unwrap(api.GET('/api/speaking/sessions/{id}', { params: { path: { id: sessionId } } })),
  });
  const [stage, setStage] = useState<Stage>('ready');
  const [turn, setTurn] = useState<Turn | null>(null);
  const [until, setUntil] = useState<number | null>(null);
  const [live, setLive] = useState('');
  const [level, setLevel] = useState(0);
  const [pending, setPending] = useState<Recording | null>(null);
  const [edited, setEdited] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notes, setNotes] = useState('');
  const recorder = useRef<AnswerRecorder | null>(null);
  const voice = useRef<SpeechRunner | null>(null);
  const stopping = useRef(false);
  const data = session.data;
  const exam = data?.mode === 'EXAM';
  const now = useNow(250, until != null);
  const remaining = until == null ? null : Math.max(0, Math.round((until - now) / 1000));

  useEffect(() => {
    if (data && data.status !== 'IN_PROGRESS')
      navigate(data?.mockTestId ? `/mock/${data.mockTestId}` : `/speaking/result/${sessionId}`, {
        replace: true,
      });
  }, [data, navigate, sessionId]);
  useEffect(
    () => () => {
      voice.current?.stop();
      recorder.current?.release();
    },
    [],
  );

  const say = useCallback(async (text: string) => {
    voice.current?.stop();
    const voices = await loadVoices();
    const v = narratorVoice(voices) as SpeechSynthesisVoice | null;
    const r = new SpeechRunner(0.98);
    voice.current = r;
    await r.speak([{ text, voice: v, pitch: 1, lang: v?.lang ?? 'en-GB' }]);
  }, []);

  const startAnswer = useCallback(async (seconds: number | null) => {
    stopping.current = false;
    setLive('');
    recorder.current ??= new AnswerRecorder(setLive, setLevel);
    await recorder.current.start();
    setStage('answer');
    setUntil(seconds ? Date.now() + seconds * 1000 : null);
  }, []);

  const mockTestId = data?.mockTestId ?? null;

  const nextTurn = useCallback(async () => {
    setError(null);
    setPending(null);
    try {
      const t = await unwrap(
        api.POST('/api/speaking/sessions/{id}/examiner', { params: { path: { id: sessionId } } }),
      );
      setTurn(t);
      setStage('examiner');
      if (t.stage === 'END') {
        await say(t.utterance);
        setStage('finishing');
        const result = await unwrap(
          api.POST('/api/speaking/sessions/{id}/finish', { params: { path: { id: sessionId } } }),
        );
        recorder.current?.release();
        queryClient.setQueryData(['speaking', 'result', sessionId], result);
        navigate(mockTestId ? `/mock/${mockTestId}` : `/speaking/result/${sessionId}`, {
          replace: true,
        });
        return;
      }
      await say(t.utterance);
      if (t.stage === 'PART2_LONG_TURN') {
        setStage('prep');
        setUntil(Date.now() + (t.prepSeconds ?? 60) * 1000);
        return;
      }
      await startAnswer(t.answerSeconds ?? null);
    } catch (e) {
      setError(e);
      setStage('ready');
    }
  }, [navigate, queryClient, say, sessionId, startAnswer, mockTestId]);

  const send = useCallback(
    async (rec: Recording, transcript: string) => {
      if (!turn) return;
      setStage('sending');
      const form = new FormData();
      form.append('part', String(turn.part));
      form.append('questionIndex', String(turn.questionIndex));
      form.append('question', turn.utterance);
      form.append('transcript', transcript);
      form.append('durationSeconds', String(rec.durationSeconds));
      if (rec.blob) form.append('audio', rec.blob, `answer.${rec.mimeType.includes('mp4') ? 'm4a' : 'webm'}`);
      try {
        await authFetch(`/api/speaking/sessions/${sessionId}/responses`, { method: 'POST', body: form });
        await nextTurn();
      } catch (e) {
        setError(e);
        setPending(rec);
        setEdited(transcript);
        setStage('review');
      }
    },
    [nextTurn, sessionId, turn],
  );

  const stopAnswer = useCallback(async () => {
    if (stopping.current || !recorder.current) return;
    stopping.current = true;
    setUntil(null);
    const rec = await recorder.current.stop();
    if (turn?.stage === 'PART2_LONG_TURN') await say('Thank you.');
    if (exam || !recognitionSupported()) {
      if (!exam && !recognitionSupported()) {
        setPending(rec);
        setEdited(rec.transcript);
        setStage('review');
        return;
      }
      await send(rec, rec.transcript);
    } else {
      setPending(rec);
      setEdited(rec.transcript);
      setStage('review');
    }
  }, [exam, say, send, turn]);

  const beginTalk = useCallback(async () => {
    setUntil(null);
    await say(TALK_CUE);
    await startAnswer(turn?.talkSeconds ?? 120);
  }, [say, startAnswer, turn]);

  // deadlines: end of preparation → talk; end of answer time → stop (exam, and always for the Part 2 talk)
  useEffect(() => {
    if (until == null) return;
    const t = window.setTimeout(
      () => {
        if (stage === 'prep') void beginTalk();
        else if (stage === 'answer' && (exam || turn?.stage === 'PART2_LONG_TURN')) void stopAnswer();
      },
      Math.max(0, until - Date.now()),
    );
    return () => window.clearTimeout(t);
  }, [until, stage, exam, turn, beginTalk, stopAnswer]);

  if (session.isLoading) return <Loading />;
  if (!data) return <ErrorBox error={session.error} />;
  const card = data.plan.part2?.cue_card;
  const partLabel = turn ? (turn.part === 0 ? 'Closing' : `Part ${turn.part}`) : 'Speaking test';
  const captionVisible = !exam || showCaption;

  return (
    <div className="exam-shell speaking-shell">
      <div className="exam-bar">
        <ExamExit to={data?.mockTestId ? `/mock/${data.mockTestId}` : '/speaking'} />
        <span className="exam-brand">IELTS · Speaking</span>
        <span className={`badge ${exam ? 'badge-accent' : 'badge-dark'}`}>
          {exam ? 'Exam mode' : 'Practice'}
        </span>
        <span className="badge badge-dark">{partLabel}</span>
        {data.conversational && <span className="badge badge-dark">Conversational examiner</span>}
        <span className="spacer" />
        {remaining != null && (
          <Timer remaining={remaining} label={stage === 'prep' ? 'Preparation' : 'Speaking time'} />
        )}
      </div>
      <div className="speaking-stage">
        <div className={`examiner-orb ${stage}`} aria-hidden="true">
          <span />
        </div>
        <div className="speaking-status">
          {stage === 'ready' && <h2>When you're ready, the examiner will begin.</h2>}
          {stage === 'examiner' && <h2>The examiner is speaking…</h2>}
          {stage === 'prep' && <h2>Prepare your talk — you have one minute</h2>}
          {stage === 'answer' && (
            <h2>
              <span className="record-dot" /> Recording your answer
            </h2>
          )}
          {stage === 'review' && <h2>Check your transcript</h2>}
          {stage === 'sending' && <h2>Saving…</h2>}
          {stage === 'finishing' && <h2>Thank you — sending your test for grading…</h2>}
        </div>

        {turn && turn.stage !== 'END' && (
          <div className="caption">
            {captionVisible ? (
              <p>“{turn.utterance}”</p>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCaption(true)}>
                Show the question
              </button>
            )}
          </div>
        )}

        {(stage === 'prep' || (stage === 'answer' && turn?.stage === 'PART2_LONG_TURN')) && card && (
          <div className="cue-card speaking-card">
            <strong>{card.prompt}</strong>
            <p style={{ margin: '0.5rem 0 0.25rem' }}>You should say:</p>
            <ul>
              {card.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p style={{ margin: 0 }}>{card.explain}</p>
            {stage === 'prep' && (
              <textarea
                className="textarea"
                rows={4}
                placeholder="Notes (not graded)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ marginTop: '0.75rem' }}
              />
            )}
          </div>
        )}

        {stage === 'answer' && (
          <div className="answer-panel">
            <div className="level-meter big">
              <div style={{ width: `${Math.round(level * 100)}%` }} />
            </div>
            {!exam && (
              <div className="mic-transcript">{live || <span className="muted">Listening…</span>}</div>
            )}
          </div>
        )}

        {stage === 'review' && pending && (
          <div className="answer-panel stack">
            <textarea
              className="textarea"
              rows={4}
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
              placeholder="Type what you said if the transcript is empty"
            />
            <div className="row">
              <button className="btn" onClick={() => send(pending, edited)}>
                Send and continue
              </button>
              <button className="btn btn-secondary" onClick={() => startAnswer(turn?.answerSeconds ?? null)}>
                Re-record
              </button>
            </div>
          </div>
        )}

        <ErrorBox error={error} />
        {error ? <p className="small muted">{errorMessage(error)}</p> : null}

        <div className="row" style={{ justifyContent: 'center' }}>
          {stage === 'ready' && (
            <button className="btn btn-lg" onClick={nextTurn}>
              {data.responses.length > 0 ? 'Continue the test' : 'Begin'}
            </button>
          )}
          {stage === 'prep' && !exam && (
            <button className="btn btn-secondary" onClick={beginTalk}>
              I'm ready to talk
            </button>
          )}
          {stage === 'answer' && (
            <button className="btn btn-lg" onClick={stopAnswer}>
              I've finished my answer
            </button>
          )}
        </div>
        <p className="small muted" style={{ textAlign: 'center' }}>
          {data.responses.length} answer{data.responses.length === 1 ? '' : 's'} recorded · transcription:{' '}
          {data.transcription === 'WHISPER' ? 'Whisper (server)' : 'browser'}
        </p>
      </div>
    </div>
  );
}
