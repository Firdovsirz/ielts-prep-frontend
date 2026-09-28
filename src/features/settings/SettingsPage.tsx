import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, Loading, PageHeader } from '../../components/ui';
import { Icon } from '../../components/icons';
import { formatUsd, titleCase } from '../../lib/format';
import { downloadExport } from '../../lib/download';
import { useAuth } from '../../app/auth';

type Settings = Schemas['SettingsDto'];
const BANDS = Array.from({ length: 11 }, (_, i) => (4 + i * 0.5).toFixed(1));

export function SettingsPage() {
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => unwrap(api.GET('/api/settings')) });
  const status = useQuery({
    queryKey: ['system', 'status'],
    queryFn: () => unwrap(api.GET('/api/system/status')),
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="Settings"
        title="Your preparation"
        subtitle="Test details drive the study plan, band targets and exam timings. Everything is stored locally in your own database."
        icon={
          <span className="module-icon plan-general">
            <Icon name="settings" size={28} strokeWidth={2} />
          </span>
        }
      />
      <ErrorBox error={settings.error} />
      {settings.isLoading ? <Loading /> : settings.data && <SettingsForm initial={settings.data} />}
      <div className="grid grid-2" style={{ marginTop: '1.2rem' }}>
        <ClaudeCard status={status.data} error={status.error} />
        <div className="stack">
          <AccountCard />
          <DataCard />
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function SettingsForm({ initial }: { initial: Settings }) {
  const qc = useQueryClient();
  const [s, setS] = useState<Settings>(initial);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
  };
  const save = useMutation({
    mutationFn: () => unwrap(api.PUT('/api/settings', { body: s })),
    onSuccess: (next) => {
      qc.setQueryData(['settings'], next);
      ['dashboard', 'plan'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setSaved(true);
    },
  });
  const changedDate = s.testDate !== initial.testDate;

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <form className="card settings-form" onSubmit={submit}>
      <section>
        <h2>Your test</h2>
        <div className="segmented" role="radiogroup" aria-label="Exam type">
          {(['ACADEMIC', 'GENERAL'] as const).map((t) => (
            <button
              type="button"
              key={t}
              role="radio"
              aria-checked={s.examType === t}
              className={s.examType === t ? 'active' : ''}
              onClick={() => set('examType', t)}
            >
              {t === 'ACADEMIC' ? 'Academic' : 'General Training'}
            </button>
          ))}
        </div>
        <div className="field-grid">
          <Field
            label="Current band"
            hint="Your starting estimate; replaced by real results as you practise."
          >
            <select
              className="select"
              value={Number(s.currentBand).toFixed(1)}
              onChange={(e) => set('currentBand', Number(e.target.value))}
            >
              {BANDS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Target band">
            <select
              className="select"
              value={Number(s.targetBand).toFixed(1)}
              onChange={(e) => set('targetBand', Number(e.target.value))}
            >
              {BANDS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Test date" hint={changedDate ? 'Rebuild the study plan after saving.' : undefined}>
            <input
              className="input"
              type="date"
              value={s.testDate ?? ''}
              onChange={(e) => set('testDate', e.target.value || null)}
            />
          </Field>
          <Field label="Daily study time" hint="Minutes per day the plan fills (Sundays get 60%).">
            <input
              className="input"
              type="number"
              min={30}
              max={300}
              step={15}
              value={s.dailyStudyMinutes ?? 90}
              onChange={(e) => set('dailyStudyMinutes', Number(e.target.value))}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2>Listening</h2>
        <div className="field-grid">
          <Field
            label={`Speech rate · ${(s.speechRate ?? 1).toFixed(2)}×`}
            hint="Browser voices; 1.0 is natural test pace."
          >
            <input
              type="range"
              min={0.8}
              max={1.2}
              step={0.05}
              value={s.speechRate ?? 1}
              onChange={(e) => set('speechRate', Number(e.target.value))}
            />
          </Field>
          <Field label="Reading time before each part" hint="Seconds to study the questions.">
            <input
              className="input"
              type="number"
              min={10}
              max={90}
              value={s.listeningReadingSeconds ?? 30}
              onChange={(e) => set('listeningReadingSeconds', Number(e.target.value))}
            />
          </Field>
          <Field label="Checking time at the end">
            <select
              className="select"
              value={s.listeningTransferMinutes ?? 2}
              onChange={(e) => set('listeningTransferMinutes', Number(e.target.value))}
            >
              <option value={2}>2 minutes (computer-delivered)</option>
              <option value={10}>10 minutes (paper-based)</option>
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h2>Error log</h2>
        <div className="field-grid" style={{ maxWidth: 420 }}>
          <Field
            label="Mark an error pattern resolved after"
            hint="Graded Writing/Speaking pieces in a row without that error."
          >
            <input
              className="input"
              type="number"
              min={2}
              max={20}
              value={s.resolvedAfterPieces ?? 5}
              onChange={(e) => set('resolvedAfterPieces', Number(e.target.value))}
            />
          </Field>
        </div>
      </section>

      <ErrorBox error={save.error} />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {saved && <span className="small text-good">Saved ✓</span>}
        <button className="btn" disabled={save.isPending}>
          Save settings
        </button>
      </div>
    </form>
  );
}

function ApiKeyForm({ source, configured }: { source: string; configured: boolean }) {
  const qc = useQueryClient();
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['system'] });
    qc.invalidateQueries({ queryKey: ['spend'] });
  };
  const save = useMutation({
    mutationFn: () => unwrap(api.PUT('/api/system/api-key', { body: { apiKey: key.trim() } })),
    onSuccess: () => {
      setKey('');
      setSaved(true);
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: () => unwrap(api.DELETE('/api/system/api-key')),
    onSuccess: () => {
      setSaved(false);
      refresh();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (key.trim()) save.mutate();
  }

  return (
    <form className="api-key-form" onSubmit={submit}>
      <label className="field">
        <span className="field-label">{configured ? 'Replace the API key' : 'Anthropic API key'}</span>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input
            className="input"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn" disabled={!key.trim() || save.isPending}>
            {save.isPending ? 'Verifying…' : 'Save key'}
          </button>
        </div>
        <span className="field-hint">
          Create one at console.anthropic.com → API keys. It is checked with Anthropic, stored only on your
          server and never shown again.
        </span>
      </label>
      <ErrorBox error={save.error ?? remove.error} />
      {saved && <div className="alert alert-good small">Key verified and saved — AI features are on.</div>}
      {source === 'APP' && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
        >
          Remove the saved key
        </button>
      )}
    </form>
  );
}

function ClaudeCard({ status, error }: { status?: Schemas['SystemStatus']; error: unknown }) {
  const verified = (status?.inventory ?? []).filter((r) => r.status === 'VERIFIED');
  const spend = status?.spend;
  const pct = spend && spend.dailyCap > 0 ? Math.min(100, (spend.spentToday / spend.dailyCap) * 100) : 0;
  return (
    <div className="card">
      <div className="card-title">
        <h2>Claude API</h2>
        <span className={`badge ${status?.apiKeyConfigured ? 'badge-good' : 'badge-warn'}`}>
          {status?.apiKeyConfigured
            ? `Key ${status.apiKeySource === 'APP' ? 'saved in the app' : 'from .env'} ${status.apiKeyHint ?? ''}`
            : 'No API key'}
        </span>
      </div>
      <ErrorBox error={error} />
      {!status?.apiKeyConfigured && (
        <p className="small">
          The app works offline with its verified seed content. Add your Anthropic API key to turn on Writing
          and Speaking grading, the AI examiner, the coach and new content.
        </p>
      )}
      {status && <ApiKeyForm source={status.apiKeySource} configured={status.apiKeyConfigured} />}
      {spend && (
        <div className="stack" style={{ gap: '0.4rem' }}>
          <div className="row-between small">
            <span>Spent today</span>
            <strong>
              {formatUsd(spend.spentToday)} of {formatUsd(spend.dailyCap)}
            </strong>
          </div>
          <div className="progress">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="row-between small muted">
            <span>{spend.callsToday} calls today</span>
            <span>{formatUsd(spend.spentLast7Days)} in the last 7 days</span>
          </div>
        </div>
      )}
      {status && (
        <table className="table" style={{ marginTop: '1rem' }}>
          <tbody>
            {Object.entries(status.models).map(([route, model]) => (
              <tr key={route}>
                <td className="small muted">{titleCase(route)}</td>
                <td>
                  <code>{model}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {verified.length > 0 && (
        <>
          <h3 style={{ marginTop: '1.2rem' }}>Verified content</h3>
          <div className="inventory">
            {verified.map((r) => (
              <span key={`${r.taskType}`} className="chip">
                {titleCase(r.taskType)} <strong>{r.count}</strong>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AccountCard() {
  const { email, applySession } = useAuth();
  const [newEmail, setNewEmail] = useState<string | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const emailValue = newEmail ?? email ?? '';
  const emailChanged = !!email && emailValue.trim().toLowerCase() !== email.toLowerCase();
  const mismatch = next.length > 0 && repeat.length > 0 && next !== repeat;
  const tooShort = next.length > 0 && next.length < 8;
  const canSave =
    !!current && (emailChanged || next.length > 0) && !mismatch && !tooShort && (!next || next === repeat);

  const save = useMutation({
    mutationFn: () =>
      unwrap(
        api.PUT('/api/auth/account', {
          body: {
            currentPassword: current,
            email: emailChanged ? emailValue.trim() : undefined,
            newPassword: next || undefined,
          },
        }),
      ),
    onSuccess: (session) => {
      applySession(session);
      setDone(
        emailChanged && next
          ? 'E-mail and password changed.'
          : emailChanged
            ? `You now sign in as ${session.email}.`
            : 'Password changed.',
      );
      setNewEmail(null);
      setCurrent('');
      setNext('');
      setRepeat('');
    },
  });

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(null);
        if (canSave) save.mutate();
      }}
    >
      <h2>Account</h2>
      <div className="field-grid">
        <Field label="Login e-mail">
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={emailValue}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </Field>
        <Field
          label="New password"
          hint={tooShort ? 'At least 8 characters.' : 'Leave empty to keep the current one.'}
        >
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        {next && (
          <Field label="Repeat the new password" hint={mismatch ? 'The passwords do not match.' : undefined}>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </Field>
        )}
        <Field label="Current password" hint="Required to change the e-mail or password.">
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
      </div>
      <ErrorBox error={save.error} />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {done && <span className="small text-good">{done} ✓</span>}
        <button className="btn btn-secondary" disabled={!canSave || save.isPending}>
          Save changes
        </button>
      </div>
    </form>
  );
}

function DataCard() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const reset = useMutation({
    mutationFn: () => unwrap(api.POST('/api/system/reset-progress', { body: { confirm } })),
    onSuccess: () => {
      setConfirm('');
      qc.invalidateQueries();
    },
  });
  async function exportAs(format: 'json' | 'csv') {
    setBusy(format);
    setError(null);
    try {
      await downloadExport(format);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="card">
      <h2>Your data</h2>
      <p className="small muted">
        Export every session, attempt, grade, error and vocabulary card. The CSV export is a ZIP with one file
        per table.
      </p>
      <div className="row">
        <button className="btn btn-secondary" onClick={() => exportAs('json')} disabled={busy != null}>
          {busy === 'json' ? 'Exporting…' : 'Export JSON'}
        </button>
        <button className="btn btn-secondary" onClick={() => exportAs('csv')} disabled={busy != null}>
          {busy === 'csv' ? 'Exporting…' : 'Export CSV (ZIP)'}
        </button>
      </div>
      <ErrorBox error={error} />
      <div className="danger-zone">
        <h3>Reset progress</h3>
        <p className="small">
          Deletes all practice history — sessions, grades, error log, grammar progress, vocabulary, plans,
          coach reports, mock tests and recordings. Content, settings and your login are kept. Export first if
          you want a copy.
        </p>
        <div className="row">
          <input
            className="input"
            placeholder="Type RESET to confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-label="Type RESET to confirm"
          />
          <button
            className="btn btn-danger"
            disabled={confirm !== 'RESET' || reset.isPending}
            onClick={() => reset.mutate()}
          >
            Reset progress
          </button>
        </div>
        <ErrorBox error={reset.error} />
        {reset.isSuccess && <div className="alert alert-good small">All progress was deleted.</div>}
      </div>
    </div>
  );
}
