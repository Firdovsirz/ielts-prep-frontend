import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../api/client';
import { useAuth } from './auth';
import { formatUsd } from '../lib/format';
import { daysUntil } from '../lib/dates';
import { Icon, Wordmark } from '../components/icons';

type NavItem = { to: string; label: string; icon: Parameters<typeof Icon>[0]['name'] };

const NAV: { section: string; links: NavItem[] }[] = [
  {
    section: 'Study',
    links: [
      { to: '/', label: 'Today', icon: 'today' },
      { to: '/plan', label: 'Study plan', icon: 'plan' },
      { to: '/dashboard', label: 'Progress', icon: 'progress' },
    ],
  },
  {
    section: 'Test practice',
    links: [
      { to: '/listening', label: 'Listening', icon: 'listening' },
      { to: '/reading', label: 'Reading', icon: 'reading' },
      { to: '/writing', label: 'Writing', icon: 'writing' },
      { to: '/speaking', label: 'Speaking', icon: 'speaking' },
      { to: '/mock', label: 'Full mock test', icon: 'mock' },
    ],
  },
  {
    section: 'Language',
    links: [
      { to: '/grammar', label: 'Grammar', icon: 'grammar' },
      { to: '/vocabulary', label: 'Vocabulary', icon: 'vocab' },
    ],
  },
  {
    section: 'Records',
    links: [
      { to: '/history', label: 'History', icon: 'history' },
      { to: '/coach', label: 'Coach reports', icon: 'coach' },
      { to: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

export function SpendIndicator({ dark }: { dark?: boolean }) {
  const { data } = useQuery({
    queryKey: ['spend'],
    queryFn: () => unwrap(api.GET('/api/system/spend')),
    refetchInterval: 60_000,
  });
  if (!data) return null;
  if (!data.apiKeyConfigured) {
    return (
      <span className={`badge ${dark ? 'badge-dark' : 'badge-warn'}`}>No API key · seed content only</span>
    );
  }
  return (
    <span className={`badge ${data.capReached ? 'badge-bad' : dark ? 'badge-dark' : ''}`}>
      API today {formatUsd(data.spentToday)} / {formatUsd(data.dailyCap)}
    </span>
  );
}

function CountdownCard() {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => unwrap(api.GET('/api/settings')) });
  const days = daysUntil(data?.testDate);
  return (
    <div className="sidebar-card">
      {days != null && days >= 0 ? (
        <div className="countdown">
          <b>{days}</b> <span>days to your test</span>
        </div>
      ) : (
        <span>Set your test date in Settings</span>
      )}
      {data && (
        <div className="row-between">
          <span>Target band</span>
          <span className="badge badge-dark">{data.targetBand?.toFixed(1)}</span>
        </div>
      )}
      <SpendIndicator dark />
    </div>
  );
}

export function Layout() {
  const { email, logout } = useAuth();
  const links = NAV.flatMap((s) => s.links);
  return (
    <div className="app">
      <aside className="sidebar">
        <Wordmark />
        {NAV.map((s) => (
          <div key={s.section}>
            <div className="nav-section">{s.section}</div>
            {s.links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} className="nav-link">
                <span className="nav-icon">
                  <Icon name={l.icon} size={17} />
                </span>
                {l.label}
              </NavLink>
            ))}
          </div>
        ))}
        <CountdownCard />
        <div className="sidebar-user" style={{ padding: '0.7rem 0.3rem 0', position: 'relative', zIndex: 1 }}>
          <span className="row" style={{ gap: '0.5rem', flexWrap: 'nowrap', minWidth: 0 }}>
            <span className="avatar">{(email ?? '?')[0]?.toUpperCase()}</span>
            <span className="truncate small">{email}</span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={logout} title="Log out">
            <Icon name="logout" size={16} />
          </button>
        </div>
        <div className="disclaimer">
          Independent study tool. Not affiliated with or endorsed by IELTS, the British Council, IDP or
          Cambridge.
        </div>
      </aside>
      <div className="main">
        <nav className="mobile-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className="nav-link">
              {l.label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </div>
  );
}
