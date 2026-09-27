import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { ReadingHome } from '../features/reading/ReadingHome';
import { ReadingSession } from '../features/reading/ReadingSession';
import { ReadingResult } from '../features/reading/ReadingResult';
import { ComingSoon } from './ComingSoon';
import { HomePage } from '../features/home/HomePage';
import { WritingHome } from '../features/writing/WritingHome';
import { WritingSession } from '../features/writing/WritingSession';
import { WritingResult } from '../features/writing/WritingResult';

export const router = createBrowserRouter([
  // Exam screens are full-screen (no sidebar), like the computer-delivered test.
  { path: '/reading/session/:id', element: <ReadingSession /> },
  { path: '/writing/session/:id', element: <WritingSession /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'reading', element: <ReadingHome /> },
      { path: 'reading/result/:id', element: <ReadingResult /> },
      { path: 'listening', element: <ComingSoon title="Listening" /> },
      { path: 'writing', element: <WritingHome /> },
      { path: 'writing/result/:id', element: <WritingResult /> },
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
