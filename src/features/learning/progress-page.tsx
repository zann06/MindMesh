import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CalendarClock,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { useCopy } from '@/app/language-store';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { buttonClassName } from '@/components/ui/button-styles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/form';
import { EmptyState, ProgressBar } from '@/components/ui/states';
import { NoProjectPanel } from '@/components/layout/no-project';
import type { MasteryState } from '@/core/domain/types';
import { formatDate, formatRelative } from '@/lib/utils';

const MASTERY_ORDER: Record<MasteryState, number> = {
  new: 0,
  learning: 1,
  familiar: 2,
  mastered: 3,
};

const copy = {
  en: {
    title: 'Progress',
    noProjectDescription: 'Mastery and review history.',
    backLearning: 'Learning',
    eyebrow: 'Mastery model',
    description:
      'Mastery is based on quiz attempts and accuracy: familiar after 3 attempts at 60%+, mastered after 5 attempts at 80%+. Review dates use local rules.',
    buildQuiz: 'Build quiz',
    learningHome: 'Learning home',
    mastery: {
      new: 'New',
      learning: 'Learning',
      familiar: 'Familiar',
      mastered: 'Mastered',
    },
    percentOfConcepts: (percent: number) => `${percent}% of concepts`,
    conceptMastery: 'Concept mastery',
    filter: 'Filter',
    allStates: 'All states',
    noConceptsYet: 'No concepts yet. Import a source or create a concept first.',
    noMatch: 'No concepts match this mastery filter.',
    accuracyLabel: (label: string) => `${label} accuracy`,
    noAttempts: 'no attempts',
    summary: 'Summary',
    averageAccuracy: 'Average accuracy',
    totalAttempts: 'Total attempts',
    reviewsDue: 'Reviews due',
    conceptsTracked: 'Concepts tracked',
    needsAttention: 'Needs attention',
    noWeak: 'No weak concepts yet. Complete a quiz to establish accuracy.',
    upcomingReview: 'Upcoming review',
    nothingScheduled: 'Nothing scheduled yet.',
    recentAttempts: 'Recent attempts',
    emptyNoAttempts: 'No attempts yet',
    emptyNoAttemptsDescription:
      'Take a generated quiz to start building mastery and review dates.',
    buildAQuiz: 'Build a quiz',
  },
  id: {
    title: 'Kemajuan',
    noProjectDescription: 'Riwayat penguasaan dan tinjauan.',
    backLearning: 'Pembelajaran',
    eyebrow: 'Model penguasaan',
    description:
      'Penguasaan didasarkan pada percobaan kuis dan akurasi: akrab setelah 3 percobaan dengan akurasi 60%+, dikuasai setelah 5 percobaan dengan akurasi 80%+. Tanggal tinjauan memakai aturan lokal.',
    buildQuiz: 'Buat kuis',
    learningHome: 'Beranda pembelajaran',
    mastery: {
      new: 'Baru',
      learning: 'Dipahami',
      familiar: 'Akrab',
      mastered: 'Dikuasai',
    },
    percentOfConcepts: (percent: number) => `${percent}% dari konsep`,
    conceptMastery: 'Penguasaan konsep',
    filter: 'Filter',
    allStates: 'Semua status',
    noConceptsYet: 'Belum ada konsep. Impor sumber atau buat konsep terlebih dahulu.',
    noMatch: 'Tidak ada konsep yang cocok dengan filter penguasaan ini.',
    accuracyLabel: (label: string) => `akurasi ${label}`,
    noAttempts: 'belum ada percobaan',
    summary: 'Ringkasan',
    averageAccuracy: 'Rata-rata akurasi',
    totalAttempts: 'Total percobaan',
    reviewsDue: 'Tinjauan jatuh tempo',
    conceptsTracked: 'Konsep terlacak',
    needsAttention: 'Perlu perhatian',
    noWeak: 'Belum ada konsep lemah. Selesaikan kuis untuk menetapkan akurasi.',
    upcomingReview: 'Tinjauan mendatang',
    nothingScheduled: 'Belum ada yang terjadwal.',
    recentAttempts: 'Percobaan terbaru',
    emptyNoAttempts: 'Belum ada percobaan',
    emptyNoAttemptsDescription:
      'Kerjakan kuis yang dibuat untuk mulai membangun penguasaan dan tanggal tinjauan.',
    buildAQuiz: 'Buat kuis',
  },
} as const;

export function ProgressPage() {
  const project = useWorkspaceStore((state) => state.activeProject);
  const c = useCopy(copy);
  const [filter, setFilter] = useState<'all' | MasteryState>('all');

  const rows = useMemo(() => {
    if (!project) return [];
    const records = new Map(
      project.learningRecords.map((record) => [record.conceptId, record]),
    );
    return project.concepts
      .map((concept) => {
        const record = records.get(concept.id);
        const accuracy =
          record && record.attempts > 0 ? record.correctAnswers / record.attempts : 0;
        return {
          concept,
          record,
          accuracy,
          mastery: record?.masteryState ?? ('new' as MasteryState),
        };
      })
      .filter((row) => filter === 'all' || row.mastery === filter)
      .sort((a, b) => {
        const masteryDiff = MASTERY_ORDER[a.mastery] - MASTERY_ORDER[b.mastery];
        if (masteryDiff !== 0) return masteryDiff;
        return (a.accuracy || 1) - (b.accuracy || 1) || a.concept.label.localeCompare(b.concept.label);
      });
  }, [project, filter]);

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader title={c.title} description={c.noProjectDescription} orb="progress" />
        <NoProjectPanel />
      </div>
    );
  }

  const records = project.learningRecords;
  const attempts = project.attempts;
  const totalConcepts = project.concepts.length;
  const masteryCounts = records.reduce(
    (counts, record) => {
      counts[record.masteryState] += 1;
      return counts;
    },
    { new: 0, learning: 0, familiar: 0, mastered: 0 } as Record<MasteryState, number>,
  );
  masteryCounts.new += Math.max(0, totalConcepts - records.length);
  const avgAccuracy =
    attempts.length > 0
      ? attempts.reduce(
          (sum, attempt) => sum + (attempt.total ? attempt.score / attempt.total : 0),
          0,
        ) / attempts.length
      : 0;
  const now = Date.now();
  const dueCount = records.filter(
    (record) => record.nextReviewAt && new Date(record.nextReviewAt).getTime() <= now,
  ).length;
  const learningByConcept = new Map(records.map((record) => [record.conceptId, record]));
  const weak = project.concepts
    .flatMap((concept) => {
      const record = learningByConcept.get(concept.id);
      if (!record || record.attempts === 0) return [];
      const accuracy = record.correctAnswers / record.attempts;
      return accuracy < 0.6 ? [{ concept, record, accuracy }] : [];
    })
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);
  const recent = [...attempts]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <Link to="/learning" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-200">
        <ArrowLeft className="h-3.5 w-3.5" /> {c.backLearning}
      </Link>
      <PageHeader
        eyebrow={c.eyebrow}
        title={c.title}
        description={c.description}
        orb="progress"
        actions={
          <>
            <Link to="/learning/new" className={buttonClassName('primary', 'sm')}>
              <Plus className="h-3.5 w-3.5" /> {c.buildQuiz}
            </Link>
            <Link to="/learning" className={buttonClassName('secondary', 'sm')}>
              {c.learningHome}
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ['new', c.mastery.new, 'text-slate-200'],
            ['learning', c.mastery.learning, 'text-amber-200'],
            ['familiar', c.mastery.familiar, 'text-cyan-200'],
            ['mastered', c.mastery.mastered, 'text-emerald-200'],
          ] as const
        ).map(([state, label, color]) => (
          <div key={state} className="surface rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${color}`}>{masteryCounts[state]}</p>
            <p className="mt-1 text-[10px] text-slate-600">
              {c.percentOfConcepts(
                totalConcepts ? Math.round((masteryCounts[state] / totalConcepts) * 100) : 0,
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader className="flex-wrap gap-3">
            <CardTitle>{c.conceptMastery}</CardTitle>
            <label className="flex items-center gap-2 text-[10px] text-slate-500">
              {c.filter}
              <Select
                value={filter}
                onChange={(event) => setFilter(event.target.value as typeof filter)}
                className="h-8 w-32 text-[11px]"
              >
                <option value="all">{c.allStates}</option>
                <option value="new">{c.mastery.new}</option>
                <option value="learning">{c.mastery.learning}</option>
                <option value="familiar">{c.mastery.familiar}</option>
                <option value="mastered">{c.mastery.mastered}</option>
              </Select>
            </label>
          </CardHeader>
          <CardContent className="p-0">
            {totalConcepts === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {c.noConceptsYet}
              </div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {c.noMatch}
              </div>
            ) : (
              <div className="divide-y divide-line-soft">
                {rows.map(({ concept, record, accuracy, mastery }) => (
                  <div key={concept.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/concepts/${concept.id}`}
                        className="block truncate text-xs font-medium text-slate-200 hover:text-cyan-200"
                      >
                        {concept.label}
                      </Link>
                      <div className="mt-1.5 flex items-center gap-2">
                        <ProgressBar
                          value={accuracy}
                          label={c.accuracyLabel(concept.label)}
                          className="max-w-[180px] flex-1"
                        />
                        <span className="text-[9px] text-slate-600">
                          {record ? `${record.correctAnswers}/${record.attempts}` : c.noAttempts}
                        </span>
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      <Badge
                        variant={
                          mastery === 'mastered'
                            ? 'emerald'
                            : mastery === 'familiar'
                              ? 'cyan'
                              : mastery === 'learning'
                                ? 'amber'
                                : 'outline'
                        }
                      >
                        {c.mastery[mastery]}
                      </Badge>
                      <p className="mt-1 text-[9px] text-slate-600">
                        {record?.lastReviewedAt ? formatRelative(record.lastReviewedAt) : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-cyan-300" /> {c.summary}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 text-[11px] text-slate-500">
              <p className="flex items-center justify-between">
                <span>{c.averageAccuracy}</span>
                <span className="text-sm font-semibold text-bright">{Math.round(avgAccuracy * 100)}%</span>
              </p>
              <p className="flex items-center justify-between">
                <span>{c.totalAttempts}</span>
                <span className="text-sm font-semibold text-bright">{attempts.length}</span>
              </p>
              <p className="flex items-center justify-between">
                <span>{c.reviewsDue}</span>
                <span className={`text-sm font-semibold ${dueCount > 0 ? 'text-amber-200' : 'text-bright'}`}>
                  {dueCount}
                </span>
              </p>
              <p className="flex items-center justify-between">
                <span>{c.conceptsTracked}</span>
                <span className="text-sm font-semibold text-bright">{records.length}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-3.5 w-3.5 text-rose-300" /> {c.needsAttention}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {weak.length === 0 ? (
                <p className="px-1 py-2 text-[11px] leading-relaxed text-slate-500">
                  {c.noWeak}
                </p>
              ) : (
                <ul className="space-y-1">
                  {weak.map(({ concept, accuracy, record }) => (
                    <li key={concept.id}>
                      <Link
                        to={`/concepts/${concept.id}`}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.04]"
                      >
                        <span className="truncate text-[11px] text-slate-300">{concept.label}</span>
                        <span className="text-[10px] text-rose-300">
                          {Math.round(accuracy * 100)}% · {record?.attempts}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5 text-amber-300" /> {c.upcomingReview}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {records.filter((record) => record.nextReviewAt).length === 0 ? (
                <p className="px-1 py-2 text-[11px] text-slate-500">{c.nothingScheduled}</p>
              ) : (
                <ul className="space-y-1">
                  {[...records]
                    .filter((record) => record.nextReviewAt)
                    .sort(
                      (a, b) =>
                        new Date(a.nextReviewAt ?? 0).getTime() -
                        new Date(b.nextReviewAt ?? 0).getTime(),
                    )
                    .slice(0, 5)
                    .map((record) => {
                      const concept = project.concepts.find(
                        (candidate) => candidate.id === record.conceptId,
                      );
                      if (!concept) return null;
                      return (
                        <li key={record.conceptId} className="flex justify-between gap-2 px-2 py-1.5">
                          <span className="truncate text-[11px] text-slate-300">{concept.label}</span>
                          <span className="shrink-0 text-[9px] text-slate-600">
                            {formatRelative(record.nextReviewAt)}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{c.recentAttempts}</CardTitle>
          <Badge variant="outline">{attempts.length}</Badge>
        </CardHeader>
        <CardContent className="p-4">
          {recent.length === 0 ? (
            <EmptyState
              icon={<Brain className="h-5 w-5" />}
              title={c.emptyNoAttempts}
              description={c.emptyNoAttemptsDescription}
              action={
                <Link to="/learning/new" className={buttonClassName('primary', 'sm')}>
                  {c.buildAQuiz}
                </Link>
              }
              className="border-0 py-6"
            />
          ) : (
            <ul className="space-y-1.5">
              {recent.map((attempt) => {
                const ratio = attempt.total ? attempt.score / attempt.total : 0;
                return (
                  <li key={attempt.id}>
                    <Link
                      to={`/learning/quiz/${attempt.quizId}/results/${attempt.id}`}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-line-soft bg-white/[0.015] px-3 py-2 hover:border-slate-500/40"
                    >
                      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-200">
                        {attempt.quizTitle}
                      </span>
                      <span className="text-[10px] text-slate-600">{formatDate(attempt.completedAt)}</span>
                      <span
                        className={`flex items-center gap-1 text-[10px] font-medium ${
                          ratio >= 0.8 ? 'text-emerald-300' : ratio >= 0.5 ? 'text-amber-300' : 'text-rose-300'
                        }`}
                      >
                        {ratio >= 0.5 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {attempt.score}/{attempt.total}
                      </span>
                      <ArrowRight className="h-3 w-3 text-slate-600" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
