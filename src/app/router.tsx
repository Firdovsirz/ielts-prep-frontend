import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { ReadingHome } from '../features/reading/ReadingHome';
import { ReadingSession } from '../features/reading/ReadingSession';
import { ReadingResult } from '../features/reading/ReadingResult';
import { ComingSoon } from './ComingSoon';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <ComingSoon title="Today" /> },
      { path: 'reading', element: <ReadingHome /> },
      { path: 'reading/session/:id', element: <ReadingSession /> },
      { path: 'reading/result/:id', element: <ReadingResult /> },
      { path: 'listening', element: <ComingSoon title="Listening" /> },
      { path: 'writing', element: <ComingSoon title="Writing" /> },
      { path: 'speaking', element: <ComingSoon title="Speaking" /> },
      { path: 'grammar', element: <ComingSoon title="Grammar" /> },
      { path: 'vocabulary', element: <ComingSoon title="Vocabulary" /> },
      { path: 'dashboard', element: <ComingSoon title="Progress" /> },
      { path: 'plan', element: <ComingSoon title="Study plan" /> },
      { path: 'mock', element: <ComingSoon title="Mock test" /> },
      { path: 'history', element: <ComingSoon title="History" /> },
      { path: 'coach', element: <ComingSoon title="Coach reports" /> },
      { path: 'settings', element: <ComingSoon title="Settings" /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
