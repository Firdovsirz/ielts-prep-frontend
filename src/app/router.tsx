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
import { GrammarHome } from '../features/grammar/GrammarHome';
import { GrammarDiagnostic } from '../features/grammar/GrammarDiagnostic';
import { GrammarArea } from '../features/grammar/GrammarArea';
import { GrammarSession } from '../features/grammar/GrammarSession';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { ListeningHome } from '../features/listening/ListeningHome';
import { ListeningSession } from '../features/listening/ListeningSession';
import { ListeningResult } from '../features/listening/ListeningResult';

export const router = createBrowserRouter([
  // Exam screens are full-screen (no sidebar), like the computer-delivered test.
  { path: '/reading/session/:id', element: <ReadingSession /> },
  { path: '/writing/session/:id', element: <WritingSession /> },
  { path: '/listening/session/:id', element: <ListeningSession /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'reading', element: <ReadingHome /> },
      { path: 'reading/result/:id', element: <ReadingResult /> },
      { path: 'listening', element: <ListeningHome /> },
      { path: 'listening/result/:id', element: <ListeningResult /> },
      { path: 'writing', element: <WritingHome /> },
      { path: 'writing/result/:id', element: <WritingResult /> },
      { path: 'speaking', element: <ComingSoon title="Speaking" /> },
      { path: 'grammar', element: <GrammarHome /> },
      { path: 'grammar/diagnostic/:id', element: <GrammarDiagnostic /> },
      { path: 'grammar/area/:area', element: <GrammarArea /> },
      { path: 'grammar/session/:id', element: <GrammarSession /> },
      { path: 'vocabulary', element: <ComingSoon title="Vocabulary" /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'plan', element: <ComingSoon title="Study plan" /> },
      { path: 'mock', element: <ComingSoon title="Mock test" /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'coach', element: <ComingSoon title="Coach reports" /> },
      { path: 'settings', element: <ComingSoon title="Settings" /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
