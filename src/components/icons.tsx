import type { ReactNode } from 'react';
import { moduleClass } from '../lib/modules';

type IconName =
  | 'today'
  | 'plan'
  | 'progress'
  | 'listening'
  | 'reading'
  | 'writing'
  | 'speaking'
  | 'mock'
  | 'grammar'
  | 'vocab'
  | 'history'
  | 'coach'
  | 'settings'
  | 'logout';

const PATHS: Record<IconName, ReactNode> = {
  today: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  plan: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" />
    </>
  ),
  progress: <path d="M4 19V5M4 19h16M7 15l4-4 3 3 5-6" />,
  listening: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
  reading: (
    <>
      <path d="M3 5.5C5.5 4 9 4 12 6c3-2 6.5-2 9-.5V19c-2.5-1.5-6-1.5-9 .5-3-2-6.5-2-9-.5z" />
      <path d="M12 6v13.5" />
    </>
  ),
  writing: (
    <>
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
      <path d="M14 7l3 3" />
    </>
  ),
  speaking: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </>
  ),
  mock: (
    <>
      <path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9" />
    </>
  ),
  grammar: (
    <>
      <path d="M5 19l5-14 5 14M7 14h6" />
      <path d="M17 10h4M19 8v4" />
    </>
  ),
  vocab: (
    <>
      <rect x="4" y="4" width="12" height="16" rx="2" />
      <path d="M8 4v16M20 8v12" />
    </>
  ),
  history: (
    <>
      <path d="M4 12a8 8 0 1 0 2.5-5.8L4 8.5" />
      <path d="M4 4v4.5h4.5M12 8v4l3 2" />
    </>
  ),
  coach: <path d="M12 3l2.4 5 5.6.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4 5.6-.8z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  logout: <path d="M15 4h4v16h-4M10 16l4-4-4-4M14 12H4" />,
};

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export type ModuleName = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING' | 'GRAMMAR' | 'VOCAB';

const MODULE_ICON: Record<ModuleName, IconName> = {
  LISTENING: 'listening',
  READING: 'reading',
  WRITING: 'writing',
  SPEAKING: 'speaking',
  GRAMMAR: 'grammar',
  VOCAB: 'vocab',
};

/** Gradient tile in the module's accent colour. */
export function ModuleIcon({ module, size = 22 }: { module: ModuleName; size?: number }) {
  return (
    <span className={`module-icon ${moduleClass(module)}`}>
      <Icon name={MODULE_ICON[module]} size={size} strokeWidth={2} />
    </span>
  );
}

/** The app's own wordmark: a crimson tile with an open-book/band glyph (the official IELTS logo is not used). */
export function Wordmark({ subtitle = 'Prep · Band 8' }: { subtitle?: string }) {
  return (
    <span className="wordmark">
      <span className="wordmark-mark">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 6.5C5.5 5 9 5 12 7c3-2 6.5-2 9-.5V19c-2.5-1.5-6-1.5-9 .5-3-2-6.5-2-9-.5z"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M12 7v12.5" stroke="#fff" strokeWidth="1.8" />
          <circle cx="18.5" cy="4.5" r="2.5" fill="#f2b544" />
        </svg>
      </span>
      <span className="wordmark-text">
        <strong>IELTS</strong>
        <span>{subtitle}</span>
      </span>
    </span>
  );
}
