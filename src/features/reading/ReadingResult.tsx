import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { BandPill, ErrorBox, Kpi, Loading, PageHeader } from '../../components/ui';
import { PassageText, type Highlight } from '../../components/passage/PassageText';
import { QuestionGroupView } from '../../components/questions/QuestionGroupView';
import { formatMinutes, titleCase } from '../../lib/format';

type Result = Schemas['QuestionResult'];

export function ReadingResult() {
  const { id } = useParams();
  const sessionId = Number(id);
  const result = useQuery({
    queryKey: ['reading', 'result', sessionId],
    queryFn: () =>
      unwrap(api.GET('/api/reading/sessions/{id}/result', { params: { path: { id: sessionId } } })),
  });
  const [active, setActive] = useState(0);
  const [highlight, setHighlight] = useState<Highlight | null>(null);

  const byNumber = useMemo(() => {
    const map: Record<number, Result> = {};
    result.data?.passages.forEach((p) => p.questions.forEach((q) => (map[q.number] = q)));
    return map;
  }, [result.data]);
  const given = useMemo(
    () => Object.fromEntries(Object.values(byNumber).map((r) => [r.number, r.given])),
    [byNumber],
  );
  const byType = useMemo(() => {
    const agg: Record<string, { correct: number; total: number }> = {};
    Object.values(byNumber).forEach((r) => {
      const a = (agg[r.question_type] ??= { correct: 0, total: 0 });
      a.total++;
      if (r.correct) a.correct++;
    });
    return Object.entries(agg).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
  }, [byNumber]);

  if (result.isLoading) return <Loading />;
  if (result.error || !result.data)
    return (
      <div className="page">
        <ErrorBox error={result.error} />
      </div>
    );
  const r = result.data;
  const text = r.passageTexts[active];
  const passageResult = r.passages[active];

  function showEvidence(n: number) {
    const q = byNumber[n];
    if (!q || !r) return;
    const idx = r.passages.findIndex((p) => p.questions.some((x) => x.number === n));
    if (idx >= 0) setActive(idx);
    setHighlight({ text: q.justification, location: q.location });
    window.setTimeout(
      () => document.getElementById('evidence')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      60,
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Reading results"
        subtitle={
          r.bandIsEstimate
            ? 'Single-passage band is an estimate (score scaled to 40 questions).'
            : 'Full-test band from the Academic conversion table.'
        }
        actions={
          <Link className="btn btn-secondary" to="/reading">
            Back to Reading
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
          <Kpi value={`${r.rawScore}/${r.maxScore}`} label="Correct answers" />
        </div>
        <div className="card">
          <Kpi
            value={formatMinutes(r.timeUsedSeconds)}
            label={`Time used of ${formatMinutes(r.timeLimitSeconds)}`}
            hint={r.passages.map((p, i) => `P${i + 1}: ${formatMinutes(p.secondsSpent)}`).join(' · ')}
          />
        </div>
        <div className="card">
          <Kpi
            value={r.blanks}
            label="Left blank"
            hint={r.blanks > 0 ? 'Always guess — blanks score zero.' : 'No blanks — good.'}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>By question type</h3>
        <div className="row">
          {byType.map(([type, a]) => (
            <span
              key={type}
              className={`badge ${a.correct === a.total ? 'badge-good' : a.correct / a.total < 0.6 ? 'badge-bad' : 'badge-warn'}`}
            >
              {titleCase(type)} {a.correct}/{a.total}
            </span>
          ))}
        </div>
      </div>

      <div className="tabs" style={{ marginTop: '1rem' }}>
        {r.passages.map((p, i) => (
          <button
            key={p.itemId}
            className={`tab${i === active ? ' active' : ''}`}
            onClick={() => setActive(i)}
          >
            {p.title} — {p.raw}/{p.max}
          </button>
        ))}
      </div>
      {text && passageResult && (
        <div className="grid grid-2">
          <div className="card">
            <PassageText passage={text.passage} highlight={highlight} />
          </div>
          <div className="card">
            {text.passage.question_groups.map((g) => (
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
