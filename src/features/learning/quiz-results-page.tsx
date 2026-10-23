import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  TrendingUp,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { useCopy } from '@/app/language-store';
import { Badge } from '@/components/ui/badge';
import { buttonClassName } from '@/components/ui/button-styles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/states';
import { NoProjectPanel } from '@/components/layout/no-project';
import { sourceHref, sourceLabel } from '@/features/documents/source-links';
import { FeatureOrb } from '@/features/world/feature-orb';
import { formatDate } from '@/lib/utils';

const copy = {
  en: {
    notFoundTitle: 'Attempt not found',
    notFoundMessage: 'This quiz attempt is not in the active workspace.',
    backToLearning: 'Back to learning',
    backLearning: 'Learning',
    accuracy: 'accuracy',
    quizComplete: 'Quiz complete',
    summary: (score: number, total: number, concepts: number) =>
      `${score} of ${total} correct · ${concepts} concept${concepts === 1 ? '' : 's'} reviewed`,
    retakeQuiz: 'Retake quiz',
    viewProgress: 'View progress',
    learningHome: 'Learning home',
    best: 'Best',
    attempts: 'Attempts',
    started: 'Started',
    originalDeletedTitle: 'Original quiz deleted',
    originalDeletedDescription:
      'This attempt and its score remain in your history, and mastery was already updated, but question prompts and explanations are no longer available.',
    answerReview: 'Answer review',
    correctIncorrect: (correct: number, incorrect: number) =>
      `${correct} correct · ${incorrect} incorrect`,
    question: (current: number) => `Question ${current}`,
    questionType: {
      'multiple-choice': 'multiple choice',
      'true-false': 'true false',
      'short-answer': 'short answer',
    },
    yourAnswer: 'Your answer',
    noAnswer: 'No answer recorded.',
    expected: 'Expected',
  },
  id: {
    notFoundTitle: 'Percobaan tidak ditemukan',
    notFoundMessage: 'Percobaan kuis ini tidak ada di ruang kerja aktif.',
    backToLearning: 'Kembali ke pembelajaran',
    backLearning: 'Pembelajaran',
    accuracy: 'akurasi',
    quizComplete: 'Kuis selesai',
    summary: (score: number, total: number, concepts: number) =>
      `${score} dari ${total} benar · ${concepts} konsep ditinjau`,
    retakeQuiz: 'Kerjakan ulang kuis',
    viewProgress: 'Lihat kemajuan',
    learningHome: 'Beranda pembelajaran',
    best: 'Terbaik',
    attempts: 'Percobaan',
    started: 'Dimulai',
    originalDeletedTitle: 'Kuis asli telah dihapus',
    originalDeletedDescription:
      'Percobaan ini dan skornya tetap tersimpan di riwayat Anda, dan penguasaan sudah diperbarui, tetapi pertanyaan dan penjelasannya tidak lagi tersedia.',
    answerReview: 'Tinjauan jawaban',
    correctIncorrect: (correct: number, incorrect: number) =>
      `${correct} benar · ${incorrect} salah`,
    question: (current: number) => `Pertanyaan ${current}`,
    questionType: {
      'multiple-choice': 'pilihan ganda',
      'true-false': 'benar salah',
      'short-answer': 'jawaban singkat',
    },
    yourAnswer: 'Jawaban Anda',
    noAnswer: 'Tidak ada jawaban yang tercatat.',
    expected: 'Diharapkan',
  },
} as const;

export function QuizResultsPage() {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const project = useWorkspaceStore((state) => state.activeProject);
  const c = useCopy(copy);

  if (!project) return <NoProjectPanel />;

  const attempt = project.attempts.find(
    (candidate) => candidate.id === attemptId && candidate.quizId === quizId,
  );
  const quiz = project.quizzes.find((candidate) => candidate.id === quizId);
  const documents = new Map(project.documents.map((document) => [document.id, document]));

  if (!attempt) {
    return (
      <ErrorState
        title={c.notFoundTitle}
        message={c.notFoundMessage}
        action={
          <Link to="/learning" className={buttonClassName('secondary', 'sm')}>
            {c.backToLearning}
          </Link>
        }
      />
    );
  }

  const ratio = attempt.total > 0 ? attempt.score / attempt.total : 0;
  const otherAttempts = project.attempts
    .filter((candidate) => candidate.quizId === attempt.quizId)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const best = otherAttempts.reduce(
    (max, candidate) => Math.max(max, candidate.total ? candidate.score / candidate.total : 0),
    0,
  );
  const conceptIds = new Set(
    attempt.answers.map((answer) => answer.conceptId).filter((id): id is string => Boolean(id)),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/learning" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-200">
          <ArrowLeft className="h-3.5 w-3.5" /> {c.backLearning}
        </Link>
        <div className="flex items-center gap-2">
          <FeatureOrb variant="quiz" size={54} />
          <Badge variant="outline">{formatDate(attempt.completedAt, true)}</Badge>
        </div>
      </div>

      <div className="surface overflow-hidden rounded-2xl">
        <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-7">
          <div
            className="relative flex h-28 w-28 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(${ratio >= 0.8 ? '#7cbfa6' : ratio >= 0.5 ? '#cbad74' : '#cb9089'} ${ratio * 360}deg, rgba(255,255,255,0.07) 0deg)`,
            }}
          >
            <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-[#0d0f14]">
              <span className="text-2xl font-semibold text-bright">{Math.round(ratio * 100)}%</span>
              <span className="text-[9px] text-slate-500">{c.accuracy}</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/80">
              {c.quizComplete}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-bright sm:text-2xl">
              {attempt.quizTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {c.summary(attempt.score, attempt.total, conceptIds.size)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {quiz ? (
                <Link to={`/learning/quiz/${quiz.id}`} className={buttonClassName('primary', 'sm')}>
                  <RotateCcw className="h-3.5 w-3.5" /> {c.retakeQuiz}
                </Link>
              ) : null}
              <Link to="/learning/progress" className={buttonClassName('secondary', 'sm')}>
                <TrendingUp className="h-3.5 w-3.5" /> {c.viewProgress}
              </Link>
              <Link to="/learning" className={buttonClassName('ghost', 'sm')}>
                {c.learningHome}
              </Link>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line-soft border-t border-line-soft">
          <div className="px-4 py-3">
            <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-slate-600">
              <Trophy className="h-3 w-3" /> {c.best}
            </p>
            <p className="mt-1 text-sm font-semibold text-bright">{Math.round(best * 100)}%</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[9px] uppercase tracking-[0.12em] text-slate-600">{c.attempts}</p>
            <p className="mt-1 text-sm font-semibold text-bright">{otherAttempts.length}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[9px] uppercase tracking-[0.12em] text-slate-600">{c.started}</p>
            <p className="mt-1 text-[11px] text-slate-300">{formatDate(attempt.startedAt, true)}</p>
          </div>
        </div>
      </div>

      {!quiz ? (
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm font-medium text-slate-200">{c.originalDeletedTitle}</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
              {c.originalDeletedDescription}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{c.answerReview}</CardTitle>
            <Badge variant="outline">
              {c.correctIncorrect(
                attempt.answers.filter((answer) => answer.correct).length,
                attempt.answers.filter((answer) => !answer.correct).length,
              )}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {quiz.questions.map((question, index) => {
              const answer = attempt.answers.find((candidate) => candidate.questionId === question.id);
              const correct = answer?.correct ?? false;
              return (
                <div
                  key={question.id}
                  className={`rounded-xl border p-4 ${
                    correct
                      ? 'border-emerald-400/20 bg-emerald-400/[0.025]'
                      : 'border-rose-400/20 bg-rose-400/[0.025]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {correct ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.1em] text-slate-600">
                        {c.question(index + 1)} · {c.questionType[question.type]}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-200">
                        {question.prompt}
                      </p>
                      <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
                        <div className="rounded-lg border border-line-soft bg-black/15 px-2.5 py-2">
                          <p className="text-[9px] uppercase tracking-[0.1em] text-slate-600">{c.yourAnswer}</p>
                          <p className="mt-1 whitespace-pre-wrap text-slate-300">
                            {answer?.answer || c.noAnswer}
                          </p>
                        </div>
                        <div className="rounded-lg border border-line-soft bg-black/15 px-2.5 py-2">
                          <p className="text-[9px] uppercase tracking-[0.1em] text-slate-600">{c.expected}</p>
                          <p className="mt-1 whitespace-pre-wrap text-slate-300">{question.correctAnswer}</p>
                        </div>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-500">
                        {question.explanation}
                      </p>
                      {question.sourceReferences.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {question.sourceReferences.map((reference) => {
                            const document = documents.get(reference.documentId);
                            return (
                              <Link
                                key={reference.id}
                                to={document ? sourceHref(reference, document) : '#'}
                                className="flex items-center gap-1.5 text-[10px] text-cyan-300/80 hover:text-cyan-200"
                              >
                                <BookOpen className="h-3 w-3" />
                                {sourceLabel(reference, document)}
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
