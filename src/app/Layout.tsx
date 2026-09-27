import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../api/client';
import { useAuth } from './auth';
import { formatUsd } from '../lib/format';

const NAV: { section: string; links: { to: string; label: string; icon: string }[] }[] = [
  {
    section: 'Study',
    links: [
      { to: '/', label: 'Today', icon: '◎' },
      { to: '/plan', label: 'Study plan', icon: '▦' },
      { to: '/dashboard', label: 'Progress', icon: '↗' },
    ],
  },
  {
    section: 'Practice',
    links: [
      { to: '/listening', label: 'Listening', icon: '♪' },
      { to: '/reading', label: 'Reading', icon: '¶' },
      { to: '/writing', label: 'Writing', icon: '✎' },
      { to: '/speaking', label: 'Speaking', icon: '◉' },
      { to: '/mock', label: 'Mock test', icon: '⧗' },
    ],
  },
  {
    section: 'Language',
    links: [
      { to: '/grammar', label: 'Grammar', icon: '§' },
      { to: '/vocabulary', label: 'Vocabulary', icon: 'Aa' },
    ],
  },
  {
    section: 'Records',
    links: [
      { to: '/history', label: 'History', icon: '☰' },
      { to: '/coach', label: 'Coach reports', icon: '✦' },
      { to: '/settings', label: 'Settings', icon: '⚙' },
    ],
  },
];

export function SpendIndicator() {
  const { data } = useQuery({
    queryKey: ['spend'],
    queryFn: () => unwrap(api.GET('/api/system/spend')),
    refetchInterval: 60_000,
  });
  if (!data) return null;
  if (!data.apiKeyConfigured) {
    return <span className="badge badge-warn">No API key — seed content only</span>;
  }
  return (
    <span className={`badge ${data.capReached ? 'badge-bad' : data.backgroundPaused ? 'badge-warn' : ''}`}>
      API today {formatUsd(data.spentToday)} / {formatUsd(data.dailyCap)}
    </span>
  );
}

export function Layout() {
  const { email, logout } = useAuth();
  const links = NAV.flatMap((s) => s.links);
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-badge">8</span> IELTS Prep
        </div>
        {NAV.map((s) => (
          <div key={s.section}>
            <div className="nav-section">{s.section}</div>
            {s.links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} className="nav-link">
                <span className="nav-icon">{l.icon}</span>
                {l.label}
              </NavLink>
            ))}
          </div>
        ))}
        <div className="sidebar-footer">
          <SpendIndicator />
          <div className="row-between">
            <span title={email ?? ''} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {email}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Log out
            </button>
          </div>
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
