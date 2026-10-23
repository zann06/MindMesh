import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Brain,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { useCopy } from '@/app/language-store';
import { toast } from '@/app/toast-store';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonClassName } from '@/components/ui/button-styles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState, ProgressBar, Skeleton } from '@/components/ui/states';
import { NoProjectPanel } from '@/components/layout/no-project';
import type { Quiz } from '@/core/domain/types';
import { buildMasteryOrbit } from '@/services/graph-engine/orbit';
import { errorMessage, formatDate, formatRelative } from '@/lib/utils';

const KnowledgeOrbit = lazy(() => import('@/features/world/knowledge-orbit'));

const copy = {
  en: {
    eyebrow: 'Deliberate practice',
    title: 'Learning',
    description:
      'Build quizzes from your own concepts and evidence. Grading, scheduling, and mastery tracking use local rules, not an AI model.',
    progress: 'Progress',
    buildQuiz: 'Build quiz',
    mastery: {
      new: 'New',
      learning: 'Learning',
      familiar: 'Familiar',
      mastered: 'Mastered',
    },
    source: {
      user: 'user',
      rules: 'rules',
      ai: 'ai',
    },
    conceptsLabel: (label: string) => `${label} concepts`,
    percentOfConcepts: (percent: number) => `${percent}% of concepts`,
    quizzes: 'Quizzes',
    savedSummary: (saved: number, questions: number) =>
      `${saved} saved · ${questions} questions total`,
    attemptsBadge: (count: number) => `${count} attempt${count === 1 ? '' : 's'}`,
    noQuizzes: 'No quizzes yet',
    noQuizzesDescription:
      'Pick concepts and generate multiple-choice, true/false, and short-answer questions from your current graph and source evidence.',
    buildFirstQuiz: 'Build your first quiz',
    questionCount: (count: number) => `${count} question${count === 1 ? '' : 's'}`,
    updated: (date: string) => `Updated ${date}`,
    attemptCount: (count: number) => `${count} attempt${count === 1 ? '' : 's'}`,
    best: (percent: number) => `Best ${percent}%`,
    start: 'Start',
    deleteQuizAria: (title: string) => `Delete ${title}`,
    masteryOrbit: 'Mastery orbit',
    masteryOrbitDescription: 'Active concepts by mastery · amber means review due',
    reviewDue: 'Review due',
    learningLoop: 'Learning loop',
    dueReview: 'Due review',
    nothingDue: 'Nothing is due. Scheduled reviews appear here after you complete a quiz.',
    due: (relative: string) => `due ${relative}`,
    practiceDue: 'Practice due concepts',
    recentAttempts: 'Recent attempts',
    noAttempts: 'No attempts recorded yet.',
    averageAccuracy: 'average quiz accuracy',
    conceptsMastered: 'concepts mastered',
    reviewsDueNow: 'reviews due now',
    emptyTitle: 'Learning starts with concepts',
    emptyDescription:
      'Create or import concepts first, then MindMesh can generate quizzes from their descriptions and relationships.',
    openUniverse: 'Open universe',
    quizDeleted: 'Quiz deleted',
    quizDeletedDescription: 'Past attempts remain in progress history.',
    deleteFailed: 'Could not delete the quiz',
    deleteTitle: (title: string) => `Delete "${title}"?`,
    deleteDescription:
      'The quiz and its questions are removed. Past attempts remain in progress history and continue to count toward mastery.',
    deleteConfirm: 'Delete quiz',
    quizFallback: 'quiz',
    noProjectDescription: 'Practice and track mastery.',
  },
  id: {
    eyebrow: 'Latihan terencana',
    title: 'Pembelajaran',
    description:
      'Buat kuis dari konsep dan bukti Anda sendiri. Penilaian, penjadwalan, dan pelacakan penguasaan memakai aturan lokal, bukan model AI.',
    progress: 'Kemajuan',
    buildQuiz: 'Buat kuis',
    mastery: {
      new: 'Baru',
      learning: 'Dipahami',
      familiar: 'Akrab',
      mastered: 'Dikuasai',
    },
    source: {
      user: 'pengguna',
      rules: 'aturan',
      ai: 'ai',
    },
    conceptsLabel: (label: string) => `konsep ${label}`,
    percentOfConcepts: (percent: number) => `${percent}% dari konsep`,
    quizzes: 'Kuis',
    savedSummary: (saved: number, questions: number) =>
      `${saved} tersimpan · ${questions} pertanyaan total`,
    attemptsBadge: (count: number) => `${count} percobaan`,
    noQuizzes: 'Belum ada kuis',
    noQuizzesDescription:
      'Pilih konsep lalu buat pertanyaan pilihan ganda, benar/salah, dan jawaban singkat dari grafik serta bukti sumber Anda saat ini.',
    buildFirstQuiz: 'Buat kuis pertama Anda',
    questionCount: (count: number) => `${count} pertanyaan`,
    updated: (date: string) => `Diperbarui ${date}`,
    attemptCount: (count: number) => `${count} percobaan`,
    best: (percent: number) => `Terbaik ${percent}%`,
    start: 'Mulai',
    deleteQuizAria: (title: string) => `Hapus ${title}`,
    masteryOrbit: 'Orbit penguasaan',
    masteryOrbitDescription: 'Konsep aktif menurut penguasaan · amber berarti perlu ditinjau',
    reviewDue: 'Perlu ditinjau',
    learningLoop: 'Siklus belajar',
    dueReview: 'Tinjauan jatuh tempo',
    nothingDue: 'Tidak ada yang jatuh tempo. Tinjauan terjadwal muncul di sini setelah Anda menyelesaikan kuis.',
    due: (relative: string) => `jatuh tempo ${relative}`,
    practiceDue: 'Latih konsep yang jatuh tempo',
    recentAttempts: 'Percobaan terbaru',
    noAttempts: 'Belum ada percobaan yang tercatat.',
    averageAccuracy: 'rata-rata akurasi kuis',
    conceptsMastered: 'konsep dikuasai',
    reviewsDueNow: 'tinjauan jatuh tempo',
    emptyTitle: 'Pembelajaran dimulai dari konsep',
    emptyDescription:
      'Buat atau impor konsep terlebih dahulu, lalu MindMesh dapat membuat kuis dari deskripsi dan relasinya.',
    openUniverse: 'Buka semesta',
    quizDeleted: 'Kuis dihapus',
    quizDeletedDescription: 'Percobaan sebelumnya tetap tersimpan di riwayat kemajuan.',
    deleteFailed: 'Tidak dapat menghapus kuis',
    deleteTitle: (title: string) => `Hapus "${title}"?`,
    deleteDescription:
      'Kuis dan pertanyaannya akan dihapus. Percobaan sebelumnya tetap tersimpan di riwayat kemajuan dan tetap dihitung untuk penguasaan.',
    deleteConfirm: 'Hapus kuis',
    quizFallback: 'kuis',
    noProjectDescription: 'Latih dan lacak penguasaan.',
  },
} as const;

export function LearningPage() {
  const project = useWorkspaceStore((state) => state.activeProject);
  const deleteQuiz = useWorkspaceStore((state) => state.deleteQuiz);
  const navigate = useNavigate();
  const c = useCopy(copy);
  const [pendingDelete, setPendingDelete] = useState<Quiz | null>(null);
  const [deleting, setDeleting] = useState(false);

  const mastery = useMemo(() => {
    if (!project) return { new: 0, learning: 0, familiar: 0, mastered: 0 };
    const recordByConcept = new Map(
      project.learningRecords.map((record) => [record.conceptId, record]),
    );
    return project.concepts.reduce(
      (counts, concept) => {
        const state = recordByConcept.get(concept.id)?.masteryState ?? 'new';
        counts[state] += 1;
        return counts;
      },
      { new: 0, learning: 0, familiar: 0, mastered: 0 },
    );
  }, [project]);

  const dueConcepts = useMemo(() => {
    if (!project) return [];
    const now = Date.now();
    const recordByConcept = new Map(
      project.learningRecords.map((record) => [record.conceptId, record]),
    );
    return project.concepts
      .map((concept) => ({ concept, record: recordByConcept.get(concept.id) }))
      .filter(
        ({ record }) =>
          record?.lastReviewedAt &&
          record.nextReviewAt &&
          new Date(record.nextReviewAt).getTime() <= now,
      )
      .sort(
        (a, b) =>
          new Date(a.record?.nextReviewAt ?? 0).getTime() -
          new Date(b.record?.nextReviewAt ?? 0).getTime(),
      )
      .slice(0, 8);
  }, [project]);

  const masteryOrbit = useMemo(
    () => (project ? buildMasteryOrbit(project) : []),
    [project],
  );

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader title={c.title} description={c.noProjectDescription} orb="learning" />
        <NoProjectPanel />
      </div>
    );
  }

  const quizzes = [...project.quizzes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const recentAttempts = [...project.attempts]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 5);
  const totalQuestions = project.quizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
  const avgAccuracy =
    project.attempts.length > 0
      ? project.attempts.reduce(
          (sum, attempt) => sum + (attempt.total ? attempt.score / attempt.total : 0),
          0,
        ) / project.attempts.length
      : 0;
  const total = project.concepts.length;
  const pct = (count: number) => (total ? count / total : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={c.eyebrow}
        title={c.title}
        description={c.description}
        orb="learning"
        actions={
          <>
            <Link to="/learning/progress" className={buttonClassName('secondary', 'sm')}>
              <TrendingUp className="h-3.5 w-3.5" /> {c.progress}
            </Link>
            <Link to="/learning/new" className={buttonClassName('primary', 'sm')}>
              <Plus className="h-3.5 w-3.5" /> {c.buildQuiz}
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: c.mastery.new, value: mastery.new, color: 'text-slate-200' },
          { label: c.mastery.learning, value: mastery.learning, color: 'text-amber-200' },
          { label: c.mastery.familiar, value: mastery.familiar, color: 'text-cyan-200' },
          { label: c.mastery.mastered, value: mastery.mastered, color: 'text-emerald-200' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                <p className={`text-xl font-semibold ${item.color}`}>{item.value}</p>
              </div>
              <div className="mt-2">
                <ProgressBar value={pct(item.value)} label={c.conceptsLabel(item.label)} />
              </div>
              <p className="mt-1 text-[10px] text-slate-600">
                {c.percentOfConcepts(Math.round(pct(item.value) * 100))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{c.quizzes}</CardTitle>
              <p className="mt-1 text-[11px] text-slate-500">
                {c.savedSummary(project.quizzes.length, totalQuestions)}
              </p>
            </div>
            <Badge variant="outline">{c.attemptsBadge(project.attempts.length)}</Badge>
          </CardHeader>
          <CardContent className="p-4">
            {quizzes.length === 0 ? (
              <div className="py-5 text-center">
                <Brain className="mx-auto h-7 w-7 text-slate-600" />
                <p className="mt-2 text-sm font-medium text-slate-200">{c.noQuizzes}</p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                  {c.noQuizzesDescription}
                </p>
                <Link to="/learning/new" className={`${buttonClassName('primary', 'sm')} mt-3`}>
                  <Plus className="h-3.5 w-3.5" /> {c.buildFirstQuiz}
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {quizzes.slice(0, 8).map((quiz) => {
                  const attempts = project.attempts
                    .filter((attempt) => attempt.quizId === quiz.id)
                    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
                  const best = attempts.reduce(
                    (max, attempt) => Math.max(max, attempt.total ? attempt.score / attempt.total : 0),
                    0,
                  );
                  return (
                    <li
                      key={quiz.id}
                      className="flex flex-col gap-2 rounded-xl border border-line-soft bg-white/[0.015] p-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            to={`/learning/quiz/${quiz.id}`}
                            className="truncate text-xs font-semibold text-bright hover:text-cyan-200"
                          >
                            {quiz.title}
                          </Link>
                          <Badge variant={quiz.source === 'rules' ? 'cyan' : quiz.source === 'ai' ? 'violet' : 'outline'}>
                            {c.source[quiz.source]}
                          </Badge>
                          <Badge variant="outline">{c.questionCount(quiz.questions.length)}</Badge>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{quiz.description}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[9px] text-slate-600">
                          <span>{c.updated(formatDate(quiz.updatedAt))}</span>
                          {attempts.length > 0 ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{c.attemptCount(attempts.length)}</span>
                              <span aria-hidden="true">·</span>
                              <span>{c.best(Math.round(best * 100))}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          to={`/learning/quiz/${quiz.id}`}
                          className={buttonClassName('secondary', 'sm')}
                        >
                          {c.start} <ArrowRight className="h-3 w-3" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-500 hover:text-rose-300"
                          onClick={() => setPendingDelete(quiz)}
                          aria-label={c.deleteQuizAria(quiz.title)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {masteryOrbit.length > 0 ? (
            <Card className="overflow-hidden border-cyan-400/15">
              <CardHeader className="py-3">
                <div>
                  <CardTitle>{c.masteryOrbit}</CardTitle>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {c.masteryOrbitDescription}
                  </p>
                </div>
                <Badge variant="cyan">3D</Badge>
              </CardHeader>
              <Suspense
                fallback={
                  <div className="p-3">
                    <Skeleton className="h-[200px] w-full rounded-xl" />
                  </div>
                }
              >
                <KnowledgeOrbit
                  focusLabel={dueConcepts.length > 0 ? c.reviewDue : c.learningLoop}
                  nodes={masteryOrbit}
                  height={200}
                  onSelect={(id) => navigate(`/concepts/${id}`)}
                />
              </Suspense>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5 text-amber-300" /> {c.dueReview}
              </CardTitle>
              <Badge variant={dueConcepts.length > 0 ? 'amber' : 'outline'}>{dueConcepts.length}</Badge>
            </CardHeader>
            <CardContent className="p-3">
              {dueConcepts.length === 0 ? (
                <p className="px-1 py-2 text-[11px] leading-relaxed text-slate-500">
                  {c.nothingDue}
                </p>
              ) : (
                <>
                  <ul className="space-y-1">
                    {dueConcepts.map(({ concept, record }) => (
                      <li key={concept.id}>
                        <Link
                          to={`/concepts/${concept.id}`}
                          className="block rounded-md px-2 py-1.5 hover:bg-white/[0.04]"
                        >
                          <span className="block truncate text-[11px] text-slate-200">{concept.label}</span>
                          <span className="block text-[9px] text-amber-200/70">
                            {c.due(formatRelative(record?.nextReviewAt))}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/learning/new?concepts=${dueConcepts.map(({ concept }) => concept.id).join(',')}`}
                    className={`${buttonClassName('secondary', 'sm')} mt-2 w-full`}
                  >
                    <CalendarClock className="h-3.5 w-3.5" /> {c.practiceDue}
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-cyan-300" /> {c.recentAttempts}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {recentAttempts.length === 0 ? (
                <p className="px-1 py-2 text-[11px] text-slate-500">{c.noAttempts}</p>
              ) : (
                <ul className="space-y-1.5">
                  {recentAttempts.map((attempt) => {
                    const ratio = attempt.total ? attempt.score / attempt.total : 0;
                    return (
                      <li key={attempt.id}>
                        <Link
                          to={`/learning/quiz/${attempt.quizId}/results/${attempt.id}`}
                          className="block rounded-md px-2 py-1.5 hover:bg-white/[0.04]"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[11px] text-slate-200">{attempt.quizTitle}</span>
                            <span
                              className={`text-[10px] font-medium ${
                                ratio >= 0.8 ? 'text-emerald-300' : ratio >= 0.5 ? 'text-amber-300' : 'text-rose-300'
                              }`}
                            >
                              {attempt.score}/{attempt.total}
                            </span>
                          </span>
                          <span className="text-[9px] text-slate-600">
                            {formatRelative(attempt.completedAt)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface flex items-center gap-3 rounded-xl p-4">
          <Target className="h-5 w-5 text-cyan-300" />
          <div>
            <p className="text-lg font-semibold leading-none text-bright">{Math.round(avgAccuracy * 100)}%</p>
            <p className="mt-1 text-[10px] text-slate-500">{c.averageAccuracy}</p>
          </div>
        </div>
        <div className="surface flex items-center gap-3 rounded-xl p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
          <div>
            <p className="text-lg font-semibold leading-none text-bright">{mastery.mastered}</p>
            <p className="mt-1 text-[10px] text-slate-500">{c.conceptsMastered}</p>
          </div>
        </div>
        <div className="surface flex items-center gap-3 rounded-xl p-4">
          <CalendarClock className="h-5 w-5 text-amber-300" />
          <div>
            <p className="text-lg font-semibold leading-none text-bright">{dueConcepts.length}</p>
            <p className="mt-1 text-[10px] text-slate-500">{c.reviewsDueNow}</p>
          </div>
        </div>
      </div>

      {project.concepts.length === 0 ? (
        <EmptyState
          icon={<Brain className="h-5 w-5" />}
          title={c.emptyTitle}
          description={c.emptyDescription}
          action={
            <Link to="/universe" className={buttonClassName('primary', 'sm')}>
              {c.openUniverse}
            </Link>
          }
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          setDeleting(true);
          try {
            await deleteQuiz(pendingDelete.id);
            toast.success(c.quizDeleted, c.quizDeletedDescription);
            setPendingDelete(null);
          } catch (error) {
            toast.error(c.deleteFailed, errorMessage(error));
          } finally {
            setDeleting(false);
          }
        }}
        title={c.deleteTitle(pendingDelete?.title ?? c.quizFallback)}
        description={c.deleteDescription}
        confirmLabel={c.deleteConfirm}
        destructive
        loading={deleting}
      />
    </div>
  );
}
