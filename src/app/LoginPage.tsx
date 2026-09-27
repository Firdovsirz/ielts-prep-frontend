import { useState, type FormEvent } from 'react';
import { useAuth } from './auth';
import { ErrorBox } from '../components/ui';
import { ModuleIcon, Wordmark } from '../components/icons';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <section className="login-hero">
        <Wordmark subtitle="Academic · personal coach" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="eyebrow">Your road to Band 8</div>
          <h1>Exam-faithful practice. Examiner-grade feedback.</h1>
          <p>
            Listening, Reading, Writing and Speaking in real test format, graded against the public band
            descriptors — with a grammar coach built from your own mistakes.
          </p>
        </div>
        <div className="login-modules">
          {(['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const).map((m) => (
            <span key={m} className="login-module">
              <ModuleIcon module={m} size={16} />
              {m[0] + m.slice(1).toLowerCase()}
            </span>
          ))}
        </div>
        <div className="band-orbit" aria-hidden="true">
          <b>8.0</b>
          <span>Target band</span>
        </div>
      </section>
      <section className="login-form-side">
        <form className="card login-card stack" onSubmit={submit}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>Welcome back</h2>
            <p className="muted">Sign in to continue your preparation.</p>
          </div>
          <label className="field">
            Email
            <input
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            Password
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <ErrorBox error={error} />
          <button className="btn btn-lg" disabled={busy} type="submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="small muted" style={{ margin: 0 }}>
            Independent study tool — not affiliated with IELTS, the British Council, IDP or Cambridge.
          </p>
        </form>
      </section>
    </div>
  );
}
