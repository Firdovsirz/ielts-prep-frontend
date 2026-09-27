import type { ReactNode } from 'react';
import { errorMessage } from '../api/client';
import { formatBand } from '../lib/format';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="row muted" style={{ padding: '1.5rem 0' }}>
      <span className="spinner" /> {label}
    </div>
  );
}

export function ErrorBox({ error, title }: { error: unknown; title?: string }) {
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert">
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
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {hint && <div className="small muted">{hint}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
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
