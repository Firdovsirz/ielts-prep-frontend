import type { ReactNode } from 'react';
import { errorMessage } from '../api/client';
import { formatBand } from '../lib/format';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="row muted" style={{ padding: '2rem' }}>
      <span className="spinner" /> {label}
    </div>
  );
}

export function ErrorBox({ error, title }: { error: unknown; title?: string }) {
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert" style={{ margin: '0.5rem 0' }}>
      {title && <strong>{title}: </strong>}
      {errorMessage(error)}
    </div>
  );
}

export function BandPill({
  band,
  large,
  label,
}: {
  band: number | null | undefined;
  large?: boolean;
  label?: string;
}) {
  return (
    <span className={`band-pill${large ? ' lg' : ''}`} title={label}>
      {formatBand(band)}
    </span>
  );
}

export function Kpi({ value, label, hint }: { value: ReactNode; label: string; hint?: ReactNode }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {hint && <div className="small muted">{hint}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  icon,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="page-header-main">
        {icon && <div className="page-header-icon">{icon}</div>}
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} role="progressbar">
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Ring gauge for a band (0–9). `target` draws a tick on the ring; colours default to white-on-dark for the hero.
 */
export function BandGauge({
  band,
  target,
  label,
  size = 150,
  color = '#ff5a73',
  track = 'rgba(255,255,255,0.12)',
}: {
  band: number | null;
  target?: number;
  label: string;
  size?: number;
  color?: string;
  track?: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const frac = band == null ? 0 : Math.max(0, Math.min(1, band / 9));
  const t = target == null ? null : (target / 9) * 360 - 90;
  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-label={`${label}: ${formatBand(band)}`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        {t != null && (
          <line
            x1={50 + 35 * Math.cos((t * Math.PI) / 180)}
            y1={50 + 35 * Math.sin((t * Math.PI) / 180)}
            x2={50 + 49 * Math.cos((t * Math.PI) / 180)}
            y2={50 + 49 * Math.sin((t * Math.PI) / 180)}
            stroke="#f2b544"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="gauge-label">
        <b>{formatBand(band)}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}
