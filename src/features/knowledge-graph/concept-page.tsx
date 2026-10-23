import { lazy, Suspense, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Brain, CalendarClock, Target } from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { Badge } from '@/components/ui/badge';
import { buttonClassName } from '@/components/ui/button-styles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar, Skeleton } from '@/components/ui/states';
import { NoProjectPanel } from '@/components/layout/no-project';
import { buildConceptOrbit } from '@/services/graph-engine/orbit';
import { ConceptInspector } from './concept-inspector';
import { formatDate, formatRelative } from '@/lib/utils';
import { useCopy } from '@/app/language-store';

const KnowledgeOrbit = lazy(() => import('@/features/world/knowledge-orbit'));

const copy = {
  en: {
    backToUniverse: 'Back to universe',
    openInUniverse: 'Open in universe',
    notFoundTitle: 'Concept not found',
    notFoundBody:
      'This concept is not in the active workspace. It may have been deleted or may belong to another project.',
    browseUniverse: 'Browse universe',
    spatialNeighborhood: 'Spatial neighborhood',
    orbitHint: (count: number) =>
      `${count} direct connection${count === 1 ? '' : 's'} · hover a node to reveal it`,
    orbitEmptyHint: 'No direct connections yet · drag to explore the focus',
    addRelationshipPrefix: 'Add a relationship in the',
    universe: 'universe',
    addRelationshipSuffix: 'to grow this constellation.',
    concept: 'Concept',
    learning: 'Learning',
    quizAccuracy: 'Quiz accuracy',
    accuracyLabel: (label: string) => `Accuracy for ${label}`,
    attempts: 'attempts',
    correct: 'correct',
    nextReview: (relative: string, date: string) => `Next review ${relative} (${date}).`,
    noReviewScheduled: 'No review scheduled. Take a related quiz to create a learning record.',
    quizzes: 'Quizzes',
    openLearning: 'Open learning',
    reviewNote:
      'Review status and provenance are editable in the inspector. Source excerpts are stored copies, not live quotes, so they remain available if a document is later removed.',
    mastery: {
      new: 'new',
      learning: 'learning',
      familiar: 'familiar',
      mastered: 'mastered',
    },
  },
  id: {
    backToUniverse: 'Kembali ke semesta',
    openInUniverse: 'Buka di semesta',
    notFoundTitle: 'Konsep tidak ditemukan',
    notFoundBody:
      'Konsep ini tidak ada di ruang kerja aktif. Konsep mungkin telah dihapus atau milik proyek lain.',
    browseUniverse: 'Jelajahi semesta',
    spatialNeighborhood: 'Lingkungan spasial',
    orbitHint: (count: number) =>
      `${count} koneksi langsung · arahkan kursor ke node untuk menampilkannya`,
    orbitEmptyHint: 'Belum ada koneksi langsung · seret untuk menjelajahi fokus',
    addRelationshipPrefix: 'Tambahkan relasi di',
    universe: 'semesta',
    addRelationshipSuffix: 'untuk menumbuhkan konstelasi ini.',
    concept: 'Konsep',
    learning: 'Pembelajaran',
    quizAccuracy: 'Akurasi kuis',
    accuracyLabel: (label: string) => `Akurasi untuk ${label}`,
    attempts: 'percobaan',
    correct: 'benar',
    nextReview: (relative: string, date: string) => `Ulasan berikutnya ${relative} (${date}).`,
    noReviewScheduled:
      'Belum ada jadwal ulasan. Kerjakan kuis terkait untuk membuat catatan pembelajaran.',
    quizzes: 'Kuis',
    openLearning: 'Buka pembelajaran',
    reviewNote:
      'Status ulasan dan provenans dapat diubah di inspektur. Kutipan sumber adalah salinan tersimpan, bukan kutipan langsung, sehingga tetap tersedia jika dokumen dihapus nanti.',
    mastery: {
      new: 'baru',
      learning: 'belajar',
      familiar: 'akrab',
      mastered: 'dikuasai',
    },
  },
} as const;

export function ConceptPage() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const navigate = useNavigate();
  const c = useCopy(copy);
  const project = useWorkspaceStore((state) => state.activeProject);
  const orbit = useMemo(
    () => (project && conceptId ? buildConceptOrbit(project, conceptId) : []),
    [project, conceptId],
  );

  if (!project) {
    return <NoProjectPanel />;
  }

  const concept = conceptId
    ? project.concepts.find((candidate) => candidate.id === conceptId)
    : undefined;
  const record = concept
    ? project.learningRecords.find((candidate) => candidate.conceptId === concept.id)
    : undefined;
  const accuracy = record && record.attempts > 0 ? record.correctAnswers / record.attempts : 0;
  const relatedQuizzes = concept
    ? project.quizzes.filter((quiz) =>
        quiz.questions.some((question) => question.conceptId === concept.id),
      )
    : [];

  return (
    <div className="space-y-5">
      {concept ? <h1 className="sr-only">{concept.label}</h1> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/universe"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {c.backToUniverse}
        </Link>
        <Link to={`/universe?focus=${conceptId ?? ''}`} className={buttonClassName('secondary', 'sm')}>
          {c.openInUniverse} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {!concept ? (
        <div className="surface rounded-xl p-8 text-center">
          <h1 className="text-lg font-semibold text-bright">{c.notFoundTitle}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            {c.notFoundBody}
          </p>
          <Link to="/universe" className={`${buttonClassName('secondary', 'sm')} mt-4`}>
            {c.browseUniverse}
          </Link>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <Card className="overflow-hidden border-cyan-400/15">
              <CardHeader className="py-3">
                <div>
                  <CardTitle>{c.spatialNeighborhood}</CardTitle>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {orbit.length > 0
                      ? c.orbitHint(orbit.length)
                      : c.orbitEmptyHint}
                  </p>
                </div>
                <Badge variant={orbit.length > 0 ? 'cyan' : 'outline'}>{orbit.length}</Badge>
              </CardHeader>
              <Suspense
                fallback={
                  <div className="p-3">
                    <Skeleton className="h-[240px] w-full rounded-xl" />
                  </div>
                }
              >
                <KnowledgeOrbit
                  focusLabel={concept.label}
                  nodes={orbit}
                  height={240}
                  onSelect={(id) => navigate(`/concepts/${id}`)}
                />
              </Suspense>
              {orbit.length === 0 ? (
                <div className="border-t border-line-soft px-4 py-3 text-[11px] leading-relaxed text-slate-500">
                  {c.addRelationshipPrefix}{' '}
                  <Link
                    to={`/universe?focus=${concept.id}`}
                    className="text-cyan-300 hover:text-cyan-200"
                  >
                    {c.universe}
                  </Link>{' '}
                  {c.addRelationshipSuffix}
                </div>
              ) : null}
            </Card>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                {c.concept}
              </p>
              <ConceptInspector conceptId={concept.id} />
            </div>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-emerald-300" /> {c.learning}
                </CardTitle>
                <Badge
                  variant={
                    record?.masteryState === 'mastered'
                      ? 'emerald'
                      : record?.masteryState === 'familiar'
                        ? 'cyan'
                        : record?.masteryState === 'learning'
                          ? 'amber'
                          : 'outline'
                  }
                >
                  {record ? c.mastery[record.masteryState] : c.mastery.new}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div>
                  <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                    <span>{c.quizAccuracy}</span>
                    <span className="text-slate-300">{Math.round(accuracy * 100)}%</span>
                  </div>
                  <ProgressBar value={accuracy} label={c.accuracyLabel(concept.label)} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                  <div className="rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2">
                    <p className="text-base font-semibold text-bright">{record?.attempts ?? 0}</p>
                    <p>{c.attempts}</p>
                  </div>
                  <div className="rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2">
                    <p className="text-base font-semibold text-bright">{record?.correctAnswers ?? 0}</p>
                    <p>{c.correct}</p>
                  </div>
                </div>
                <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
                  <CalendarClock className="mt-0.5 h-3 w-3 shrink-0" />
                  {record?.nextReviewAt
                    ? c.nextReview(
                        formatRelative(record.nextReviewAt),
                        formatDate(record.nextReviewAt),
                      )
                    : c.noReviewScheduled}
                </p>
                {relatedQuizzes.length > 0 ? (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                      {c.quizzes}
                    </p>
                    <ul className="space-y-0.5">
                      {relatedQuizzes.slice(0, 4).map((quiz) => (
                        <li key={quiz.id}>
                          <Link
                            to={`/learning/quiz/${quiz.id}`}
                            className="block truncate rounded px-1 py-1 text-[11px] text-slate-300 hover:text-cyan-200"
                          >
                            {quiz.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <Link to="/learning" className={`${buttonClassName('ghost', 'sm')} w-full`}>
                  <Brain className="h-3.5 w-3.5" /> {c.openLearning}
                </Link>
              </CardContent>
            </Card>

            <div className="rounded-xl border border-line-soft bg-white/[0.015] px-4 py-3 text-[10px] leading-relaxed text-slate-600">
              {c.reviewNote}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
