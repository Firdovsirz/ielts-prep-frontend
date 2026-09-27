import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, Loading, PageHeader } from '../../components/ui';
import { ModuleIcon } from '../../components/icons';
import { formatDate, titleCase } from '../../lib/format';
import { heatStep } from '../../lib/chartData';

type Area = Schemas['GrammarAreaSummary'];
type Pattern = Schemas['GrammarErrorPracticeRow'];

const TREND: Record<string, string> = {
  NEW: 'badge-accent',
  WORSENING: 'badge-bad',
  IMPROVING: 'badge-good',
  STABLE: '',
  RESOLVED: 'badge-good',
};

export function GrammarHome() {
  const navigate = useNavigate();
  const overview = useQuery({ queryKey: ['grammar'], queryFn: () => unwrap(api.GET('/api/grammar')) });
  const startDiag = useMutation({
    mutationFn: () => unwrap(api.POST('/api/grammar/diagnostic')),
    onSuccess: (d) => navigate(`/grammar/diagnostic/${d.diagnosticId}`),
  });
  const drill = useMutation({
    mutationFn: (subtype: string) =>
      unwrap(api.POST('/api/grammar/error-practice/{subtype}/start', { params: { path: { subtype } } })),
    onSuccess: (s) => navigate(`/grammar/session/${s.sessionId}`),
  });

  if (overview.isLoading) return <Loading />;
  const o = overview.data;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Grammatical Range & Accuracy"
        title="Grammar coach"
        subtitle="Thirteen areas IELTS examiners reward, a diagnostic to find your gaps, and drills built from the sentences you actually wrote."
        icon={<ModuleIcon module="GRAMMAR" size={28} />}
      />
      <ErrorBox error={overview.error ?? startDiag.error ?? drill.error} />
      {o && !o.diagnosticDone && (
        <div className="card callout m-grammar" style={{ marginBottom: '1.2rem' }}>
          <div>
            <div className="eyebrow">Start here</div>
            <h2 style={{ margin: 0 }}>40-question adaptive diagnostic</h2>
            <p className="muted" style={{ margin: '0.3rem 0 0' }}>
              About 15 minutes. Questions get harder when you are right and easier when you are not, so each
              area is scored at your level.
            </p>
          </div>
          <button className="btn btn-lg" onClick={() => startDiag.mutate()} disabled={startDiag.isPending}>
            {o.diagnosticInProgress ? 'Continue diagnostic' : 'Start diagnostic'}
          </button>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">
            <h2>Your error patterns</h2>
            <span className="small muted">From graded Writing & Speaking</span>
          </div>
          {o && o.errorPatterns.length === 0 && (
            <p className="muted">
              No grammar errors logged yet. Submit a Writing task or Speaking test and your patterns will
              appear here.
            </p>
          )}
          <div className="stack" style={{ gap: 0 }}>
            {o?.errorPatterns.slice(0, 10).map((p) => (
              <PatternRow
                key={p.subtype}
                p={p}
                onDrill={() => drill.mutate(p.subtype)}
                busy={drill.isPending}
              />
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            <h2>Proficiency by area</h2>
            {o?.diagnosticDone && (
              <button className="btn btn-ghost btn-sm" onClick={() => startDiag.mutate()}>
                Retake diagnostic
              </button>
            )}
          </div>
          <div className="stack" style={{ gap: '0.45rem' }}>
            {o?.areas.map((a) => (
              <AreaBar key={a.key} a={a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PatternRow({ p, onDrill, busy }: { p: Pattern; onDrill: () => void; busy: boolean }) {
  const ex = p.examples[0];
  return (
    <div className="list-row" style={{ alignItems: 'flex-start' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="row" style={{ gap: '0.4rem' }}>
          <strong>{titleCase(p.subtype)}</strong>
          <span className={`badge ${TREND[p.trend] ?? ''}`}>{p.retest ? 'RE-TEST' : p.trend}</span>
          <span className="small muted">
            ×{p.total} · last {formatDate(p.lastSeen)}
          </span>
        </div>
        {ex && (
          <div className="small" style={{ marginTop: '0.2rem' }}>
            <span className="strike">{ex.original}</span> → <strong>{ex.correction}</strong>
          </div>
        )}
      </div>
      <button className="btn btn-sm" onClick={onDrill} disabled={busy}>
        {p.drillReady ? 'Drill ✦' : 'Drill'}
      </button>
    </div>
  );
}

function AreaBar({ a }: { a: Area }) {
  const pct = a.proficiency ?? 0;
  return (
    <Link to={`/grammar/area/${a.key}`} className="area-row">
      <span className="area-name">
        {a.name}
        {a.recommended && <span className="badge badge-primary">focus</span>}
        {a.openErrors > 0 && <span className="badge badge-bad">{a.openErrors} errors</span>}
      </span>
      <span className="area-meter" title={a.proficiency == null ? 'Not tested yet' : `${pct.toFixed(0)}%`}>
        <span style={{ width: `${pct}%`, background: heatStep(a.proficiency == null ? null : pct / 100) }} />
      </span>
      <span className="area-pct">{a.proficiency == null ? '—' : `${Math.round(pct)}`}</span>
    </Link>
  );
}
