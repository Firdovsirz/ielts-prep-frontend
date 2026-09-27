import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { BandPill, ErrorBox, Kpi, Loading, PageHeader } from '../../components/ui';
import { QuestionGroupView } from '../../components/questions/QuestionGroupView';
import { assignVoices } from '../../lib/voices';
import { loadVoices, SpeechRunner } from '../../lib/speech';
import { titleCase } from '../../lib/format';

type Result = Schemas['QuestionResult'];
type SectionView = Schemas['ListeningSectionView'];

export function ListeningResult() {
  const { id } = useParams();
  const sessionId = Number(id);
  const result = useQuery({
    queryKey: ['listening', 'result', sessionId],
    queryFn: () =>
      unwrap(api.GET('/api/listening/sessions/{id}/result', { params: { path: { id: sessionId } } })),
  });
  const [active, setActive] = useState(0);
  const [focusLine, setFocusLine] = useState<number | null>(null);
  const byNumber = useMemo(() => {
    const map: Record<number, Result> = {};
    result.data?.sections.forEach((s) => s.questions.forEach((q) => (map[q.number] = q)));
    return map;
  }, [result.data]);
  const given = useMemo(
    () => Object.fromEntries(Object.values(byNumber).map((r) => [r.number, r.given])),
    [byNumber],
  );

  if (result.isLoading) return <Loading />;
  const r = result.data;
  if (!r) return <ErrorBox error={result.error} />;
  const text = r.sectionTexts[active];
  const sr = r.sections[active];

  function showEvidence(n: number) {
    const q = byNumber[n];
    if (!q || !r) return;
    const idx = r.sections.findIndex((s) => s.questions.some((x) => x.number === n));
    if (idx >= 0) setActive(idx);
    setFocusLine(Number(q.location));
    window.setTimeout(
      () => document.getElementById('evidence-line')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      80,
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Listening results"
        title={`${r.rawScore} of ${r.maxScore} correct`}
        subtitle={
          r.bandIsEstimate
            ? 'Single-part band is an estimate (score scaled to 40).'
            : 'Band from the Listening conversion table.'
        }
        actions={
          <Link className="btn btn-secondary" to="/listening">
            Back to Listening
          </Link>
        }
      />
      <div className="grid grid-4">
        <div className="card">
          <Kpi
            value={<BandPill band={r.band} large />}
            label={r.bandIsEstimate ? 'Estimated band' : 'Band'}
          />
        </div>
        <div className="card">
          <Kpi value={`${r.rawScore}/${r.maxScore}`} label="Correct" />
        </div>
        <div className="card">
          <Kpi value={r.blanks} label="Left blank" hint="Never leave a gap — guess." />
        </div>
        <div className="card">
          <Kpi value={r.sections.map((s) => `${s.raw}`).join(' · ')} label="Per part" />
        </div>
      </div>
      <div className="tabs" style={{ marginTop: '1.2rem' }}>
        {r.sections.map((s, i) => (
          <button
            key={s.itemId}
            className={`tab${i === active ? ' active' : ''}`}
            onClick={() => {
              setActive(i);
              setFocusLine(null);
            }}
          >
            Part {s.section} — {s.raw}/{s.max}
          </button>
        ))}
      </div>
      {text && sr && (
        <div className="grid grid-2">
          <div className="card">
            <div className="card-title">
              <h3>{sr.title}</h3>
              <span className="small muted">Transcript — double-check where each answer was said</span>
            </div>
            <Transcript section={text} focus={focusLine} />
          </div>
          <div className="card">
            {text.section.question_groups.map((g) => (
              <QuestionGroupView
                key={g.group_id}
                group={g}
                offset={text.numberOffset}
                answers={given}
                results={byNumber}
                onShowEvidence={showEvidence}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Transcript({ section, focus }: { section: SectionView; focus: number | null }) {
  const runner = useRef<SpeechRunner | null>(null);
  const voices = useRef<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    loadVoices().then((v) => (voices.current = v));
    return () => runner.current?.stop();
  }, []);
  const s = section.section;
  const names = Object.fromEntries(s.speakers.map((sp) => [sp.id, sp]));

  function play(i: number) {
    runner.current?.stop();
    const plan = assignVoices(s.speakers, voices.current);
    const line = s.script[i]!;
    const p = plan[line.speaker];
    const r = new SpeechRunner(1);
    runner.current = r;
    r.speak([
      {
        text: line.text,
        voice: (p?.voice as SpeechSynthesisVoice | null) ?? null,
        pitch: p?.pitch ?? 1,
        lang: p?.lang ?? 'en-GB',
      },
    ]);
  }

  return (
    <div className="transcript-lines">
      {s.script.map((l, i) => (
        <div
          key={i}
          id={focus === i ? 'evidence-line' : undefined}
          className={`t-line${focus === i ? ' focus' : ''}`}
        >
          <div className="t-speaker">
            {names[l.speaker]?.name ?? l.speaker}
            <span className="small muted">{titleCase(names[l.speaker]?.accent ?? '')}</span>
          </div>
          <div className="t-text">
            {l.text}{' '}
            <button
              className="t-play"
              onClick={() => play(i)}
              title="Play this line"
              aria-label="Play this line"
            >
              ▶
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
