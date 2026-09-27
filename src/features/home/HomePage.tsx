import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import { BandGauge } from '../../components/ui';
import { ModuleIcon, type ModuleName } from '../../components/icons';
import { moduleClass } from '../../lib/modules';
import { daysUntil, greeting } from '../../lib/dates';

const MODULES: { module: ModuleName; to: string; title: string; blurb: string; meta: string }[] = [
  {
    module: 'LISTENING',
    to: '/listening',
    title: 'Listening',
    blurb: '4 sections · 40 questions · plays once in exam mode',
    meta: '30 min',
  },
  {
    module: 'READING',
    to: '/reading',
    title: 'Reading',
    blurb: '3 passages · all 14 question types · evidence highlighting',
    meta: '60 min',
  },
  {
    module: 'WRITING',
    to: '/writing',
    title: 'Writing',
    blurb: 'Real Task 1 figures · Task 2 essays · 4-criteria grading',
    meta: '60 min',
  },
  {
    module: 'SPEAKING',
    to: '/speaking',
    title: 'Speaking',
    blurb: 'AI examiner · Parts 1–3 · recorded and transcribed',
    meta: '11–14 min',
  },
  {
    module: 'GRAMMAR',
    to: '/grammar',
    title: 'Grammar',
    blurb: 'Diagnostic · 13 areas · drills built from your errors',
    meta: 'daily',
  },
  {
    module: 'VOCAB',
    to: '/vocabulary',
    title: 'Vocabulary',
    blurb: 'Spaced repetition · AWL tags · topic word banks',
    meta: 'daily',
  },
];

export function HomePage() {
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => unwrap(api.GET('/api/settings')) });
  const s = settings.data;
  const days = daysUntil(s?.testDate);

  return (
    <div className="page">
      <section className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="eyebrow">IELTS Academic · {greeting()}</div>
          <h1>Let&apos;s move you to Band {s?.targetBand?.toFixed(1) ?? '8.0'}.</h1>
          <p>
            Every attempt is recorded, graded against the public band descriptors and fed back into your study
            plan and grammar drills.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <b>{days != null && days >= 0 ? days : '—'}</b>
              <span>days to test</span>
            </div>
            <div className="hero-stat">
              <b>{s?.currentBand?.toFixed(1) ?? '—'}</b>
              <span>starting band</span>
            </div>
            <div className="hero-stat">
              <b>{s?.targetBand?.toFixed(1) ?? '—'}</b>
              <span>target band</span>
            </div>
          </div>
          <div className="row" style={{ marginTop: '1.3rem' }}>
            <Link className="btn btn-light" to="/mock">
              Take a full mock test
            </Link>
            <Link className="btn" to="/plan">
              Today&apos;s plan
            </Link>
          </div>
        </div>
        <div className="hero-gauges">
          <BandGauge
            band={s?.currentBand ?? null}
            target={s?.targetBand ?? undefined}
            label="Estimated"
            size={160}
          />
          <BandGauge band={s?.targetBand ?? null} label="Target" size={120} color="#f2b544" />
        </div>
      </section>

      <div className="row-between" style={{ margin: '2rem 0 1rem' }}>
        <div>
          <div className="eyebrow">Practice</div>
          <h2 style={{ margin: 0 }}>Choose a module</h2>
        </div>
      </div>
      <div className="grid grid-3">
        {MODULES.map((m) => (
          <Link key={m.module} to={m.to} className={`module-card ${moduleClass(m.module)}`}>
            <div className="row-between" style={{ position: 'relative', zIndex: 1 }}>
              <ModuleIcon module={m.module} />
              <span className="badge">{m.meta}</span>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{m.title}</h3>
              <p className="muted small" style={{ margin: 0 }}>
                {m.blurb}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
