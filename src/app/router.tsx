import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { ReadingHome } from '../features/reading/ReadingHome';
import { ReadingSession } from '../features/reading/ReadingSession';
import { ReadingResult } from '../features/reading/ReadingResult';
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
import { SpeakingHome } from '../features/speaking/SpeakingHome';
import { SpeakingSession } from '../features/speaking/SpeakingSession';
import { SpeakingResult } from '../features/speaking/SpeakingResult';
import { VocabularyPage } from '../features/vocab/VocabularyPage';
import { PlanPage } from '../features/plan/PlanPage';
import { CoachPage } from '../features/coach/CoachPage';
import { MockHome } from '../features/mock/MockHome';
import { MockRunner } from '../features/mock/MockRunner';
import { MockReport } from '../features/mock/MockReport';
import { SettingsPage } from '../features/settings/SettingsPage';

export const router = createBrowserRouter([
  // Exam screens are full-screen (no sidebar), like the computer-delivered test.
  { path: '/reading/session/:id', element: <ReadingSession /> },
  { path: '/writing/session/:id', element: <WritingSession /> },
  { path: '/listening/session/:id', element: <ListeningSession /> },
  { path: '/speaking/session/:id', element: <SpeakingSession /> },
  { path: '/mock/:id', element: <MockRunner /> },
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
      { path: 'speaking', element: <SpeakingHome /> },
      { path: 'speaking/result/:id', element: <SpeakingResult /> },
      { path: 'grammar', element: <GrammarHome /> },
      { path: 'grammar/diagnostic/:id', element: <GrammarDiagnostic /> },
      { path: 'grammar/area/:area', element: <GrammarArea /> },
      { path: 'grammar/session/:id', element: <GrammarSession /> },
      { path: 'vocabulary', element: <VocabularyPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'plan', element: <PlanPage /> },
      { path: 'mock', element: <MockHome /> },
      { path: 'mock/report/:id', element: <MockReport /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'coach', element: <CoachPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
