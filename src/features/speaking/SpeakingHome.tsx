import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, PageHeader } from '../../components/ui';
import { ModuleIcon } from '../../components/icons';
import { AnswerRecorder, recognitionSupported, recordingSupported } from '../../lib/recorder';

type StartBody = Schemas['SpeakingStartRequest'];

export function SpeakingHome() {
  const navigate = useNavigate();
  const spend = useQuery({ queryKey: ['spend'], queryFn: () => unwrap(api.GET('/api/system/spend')) });
  const [conversational, setConversational] = useState(true);
  const start = useMutation({
    mutationFn: (body: StartBody) => unwrap(api.POST('/api/speaking/sessions', { body })),
    onSuccess: (s) => navigate(`/speaking/session/${s.sessionId}`),
  });
  const aiExaminer = !!spend.data?.apiKeyConfigured;
  const go = (mode: StartBody['mode'], scope: StartBody['scope']) =>
    start.mutate({ mode, scope, conversational: aiExaminer && conversational });

  return (
    <div className="page">
      <PageHeader
        eyebrow="Speaking"
        title="Talk to an examiner"
        subtitle="Part 1 interview, Part 2 cue card with one minute to prepare and two to talk, then Part 3 discussion. Your answers are recorded, transcribed and graded on all four criteria."
        icon={<ModuleIcon module="SPEAKING" size={28} />}
      />
      <ErrorBox error={start.error} title="Could not start" />
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)' }}>
        <div className="stack" style={{ gap: '1rem' }}>
          <div className="card speaking-hero m-speaking">
            <div>
              <div className="eyebrow">Full test · 11–14 minutes</div>
              <h2>Exam simulation</h2>
              <p className="muted">
                The examiner speaks each question; recording starts automatically and stops at the time limit,
                as in the real test. No questions on screen.
              </p>
            </div>
            <div className="row">
              <button className="btn btn-lg" disabled={start.isPending} onClick={() => go('EXAM', 'TEST')}>
                Start the test
              </button>
              <button
                className="btn btn-secondary"
                disabled={start.isPending}
                onClick={() => go('PRACTICE', 'TEST')}
              >
                Practice run (with captions)
              </button>
            </div>
            <label className="row small" style={{ gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={aiExaminer && conversational}
                disabled={!aiExaminer}
                onChange={(e) => setConversational(e.target.checked)}
              />
              Conversational examiner (Claude asks follow-ups based on your answers)
              {!aiExaminer && <span className="badge badge-warn">needs API key</span>}
            </label>
          </div>
          <div className="grid grid-3">
            {(['PART1', 'PART2', 'PART3'] as const).map((p, i) => (
              <div key={p} className="card card-hover stack">
                <h3>Part {i + 1}</h3>
                <p className="small muted">
                  {
                    [
                      'Familiar topics, 4–5 minutes',
                      'Cue card: prepare 1 min, talk 2 min',
                      'Abstract discussion, 4–5 minutes',
                    ][i]
                  }
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={start.isPending}
                  onClick={() => go('PRACTICE', p)}
                >
                  Practise Part {i + 1}
                </button>
              </div>
            ))}
          </div>
        </div>
        <MicCheck />
      </div>
    </div>
  );
}

export function MicCheck() {
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [on, setOn] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const rec = useRef<AnswerRecorder | null>(null);
  useEffect(() => () => rec.current?.release(), []);

  async function toggle() {
    setError(null);
    if (on) {
      await rec.current?.stop();
      rec.current?.release();
      rec.current = null;
      setOn(false);
      setLevel(0);
      return;
    }
    try {
      rec.current = new AnswerRecorder(setTranscript, setLevel);
      await rec.current.start();
      setOn(true);
    } catch (e) {
      setError(e);
    }
  }

  return (
    <div className="card stack">
      <h3>Microphone check</h3>
      <p className="small muted">Say a sentence. The bar should move and your words should appear.</p>
      <div className="level-meter">
        <div style={{ width: `${Math.round(level * 100)}%` }} />
      </div>
      <div className="mic-transcript">
        {transcript || <span className="muted">Transcript appears here…</span>}
      </div>
      <button className="btn btn-secondary" onClick={toggle} disabled={!recordingSupported()}>
        {on ? 'Stop' : 'Test microphone'}
      </button>
      <ErrorBox error={error} />
      <ul className="small muted" style={{ margin: 0, paddingLeft: '1.1rem' }}>
        <li>Recording: {recordingSupported() ? 'supported' : 'not supported in this browser'}</li>
        <li>
          Live transcription:{' '}
          {recognitionSupported()
            ? 'supported (Web Speech API)'
            : 'not available — use Chrome or Edge, or configure Whisper'}
        </li>
      </ul>
    </div>
  );
}
