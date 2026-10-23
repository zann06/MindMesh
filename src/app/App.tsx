import { lazy, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useWorkspaceStore } from './workspace-store';
import { useCopy } from './language-store';
import { AppShell } from '@/components/layout/app-shell';
import { LogoMark } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { WelcomePage } from '@/features/onboarding/welcome-page';
import { Toaster } from '@/components/ui/toaster';

const UniversePage = lazy(() =>
  import('@/features/world/universe-page').then((module) => ({ default: module.UniversePage })),
);
const DocumentsPage = lazy(() =>
  import('@/features/documents/documents-page').then((module) => ({
    default: module.DocumentsPage,
  })),
);
const DocumentViewerPage = lazy(() =>
  import('@/features/documents/document-viewer-page').then((module) => ({
    default: module.DocumentViewerPage,
  })),
);
const ConceptPage = lazy(() =>
  import('@/features/knowledge-graph/concept-page').then((module) => ({
    default: module.ConceptPage,
  })),
);
const SearchPage = lazy(() =>
  import('@/features/search/search-page').then((module) => ({ default: module.SearchPage })),
);
const LearningPage = lazy(() =>
  import('@/features/learning/learning-page').then((module) => ({ default: module.LearningPage })),
);
const ProgressPage = lazy(() =>
  import('@/features/learning/progress-page').then((module) => ({ default: module.ProgressPage })),
);
const QuizBuilderPage = lazy(() =>
  import('@/features/learning/quiz-builder-page').then((module) => ({
    default: module.QuizBuilderPage,
  })),
);
const QuizSessionPage = lazy(() =>
  import('@/features/learning/quiz-session-page').then((module) => ({
    default: module.QuizSessionPage,
  })),
);
const QuizResultsPage = lazy(() =>
  import('@/features/learning/quiz-results-page').then((module) => ({
    default: module.QuizResultsPage,
  })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/settings-page').then((module) => ({ default: module.SettingsPage })),
);
const DataPage = lazy(() =>
  import('@/features/data/data-page').then((module) => ({ default: module.DataPage })),
);
const AboutPage = lazy(() =>
  import('@/features/about/about-page').then((module) => ({ default: module.AboutPage })),
);
const PrivacyPage = lazy(() =>
  import('@/features/about/privacy-page').then((module) => ({ default: module.PrivacyPage })),
);
const NotFoundPage = lazy(() =>
  import('@/features/about/not-found-page').then((module) => ({ default: module.NotFoundPage })),
);

const startupCopy = {
  en: {
    errorTitle: 'The local workspace could not start',
    corrupt:
      'Your browser may contain a corrupt or newer data record. Retry first. Only clear local data if you have exported anything you need.',
    retry: 'Retry',
    clear: 'Clear local workspace',
    deleteTitle: 'Delete all local workspaces?',
    deleteDescription:
      'This removes every project, document record, concept, quiz, and learning record from this browser. It cannot be undone unless you exported a project. AI settings and keys are stored separately.',
    deleteConfirm: 'Delete local data',
    preparing: 'Preparing your local universe',
    reading: 'Reading IndexedDB · no network request',
  },
  id: {
    errorTitle: 'Ruang kerja lokal tidak dapat dimulai',
    corrupt:
      'Browser Anda mungkin menyimpan data yang rusak atau versi yang lebih baru. Coba lagi terlebih dahulu. Hapus data lokal hanya jika Anda sudah mengekspor hal yang penting.',
    retry: 'Coba lagi',
    clear: 'Hapus ruang kerja lokal',
    deleteTitle: 'Hapus semua ruang kerja lokal?',
    deleteDescription:
      'Tindakan ini menghapus setiap proyek, catatan dokumen, konsep, kuis, dan riwayat belajar dari browser ini. Tidak dapat dibatalkan kecuali Anda sudah mengekspor proyek. Pengaturan AI dan kunci disimpan terpisah.',
    deleteConfirm: 'Hapus data lokal',
    preparing: 'Menyiapkan semesta lokal Anda',
    reading: 'Membaca IndexedDB · tanpa permintaan jaringan',
  },
};

function StartupSplash({ error }: { error?: string | null }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const init = useWorkspaceStore((state) => state.init);
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace);
  const c = useCopy(startupCopy);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="surface w-full max-w-lg rounded-2xl p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-500/[0.08] text-rose-200">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-bright">{c.errorTitle}</h1>
          <p className="mt-2 text-sm leading-relaxed text-mist">{error}</p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">{c.corrupt}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button
              variant="primary"
              leftIcon={<RotateCcw className="h-4 w-4" />}
              onClick={() => {
                void init();
              }}
            >
              {c.retry}
            </Button>
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              {c.clear}
            </Button>
          </div>
        </div>
        <ConfirmDialog
          open={confirmReset}
          onClose={() => setConfirmReset(false)}
          onConfirm={async () => {
            setResetting(true);
            try {
              await resetWorkspace();
              window.location.reload();
            } finally {
              setResetting(false);
            }
          }}
          title={c.deleteTitle}
          description={c.deleteDescription}
          confirmLabel={c.deleteConfirm}
          destructive
          loading={resetting}
        />
        <Toaster />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse-soft rounded-full bg-cyan-400/20 blur-3xl" aria-hidden="true" />
        <LogoMark className="relative h-14 w-14 animate-float" />
      </div>
      <p className="mt-6 text-sm font-medium tracking-tight text-bright">{c.preparing}</p>
      <p className="mt-1 text-xs text-slate-500">{c.reading}</p>
    </div>
  );
}

const routerBase = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';

export function App() {
  const init = useWorkspaceStore((state) => state.init);
  const initialized = useWorkspaceStore((state) => state.initialized);
  const error = useWorkspaceStore((state) => state.error);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void init();
  }, [init]);

  if (!initialized) {
    return <StartupSplash error={error} />;
  }

  return (
    <BrowserRouter basename={routerBase}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="welcome" element={<WelcomePage />} />
          <Route path="universe" element={<UniversePage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/:documentId" element={<DocumentViewerPage />} />
          <Route path="concepts/:conceptId" element={<ConceptPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="learning" element={<LearningPage />} />
          <Route path="learning/progress" element={<ProgressPage />} />
          <Route path="learning/new" element={<QuizBuilderPage />} />
          <Route path="learning/quiz/:quizId" element={<QuizSessionPage />} />
          <Route path="learning/quiz/:quizId/results/:attemptId" element={<QuizResultsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="data" element={<DataPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
