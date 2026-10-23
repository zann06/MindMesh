import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  CircleHelp,
  Flag,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { useCopy } from '@/app/language-store';
import { toast } from '@/app/toast-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonClassName } from '@/components/ui/button-styles';
import { Textarea } from '@/components/ui/form';
import { ErrorState, ProgressBar } from '@/components/ui/states';
import { FeatureOrb } from '@/features/world/feature-orb';
import { NoProjectPanel } from '@/components/layout/no-project';
import { gradeAnswer } from '@/services/quiz-engine/generate';
import { sourceHref, sourceLabel } from '@/features/documents/source-links';
import type { QuizAnswer, QuizAttempt } from '@/core/domain/types';
import { cn, errorMessage, formatDate, newId, nowIso } from '@/lib/utils';

const copy = {
  en: {
    notFoundTitle: 'Quiz not found',
    notFoundMessage:
      'This quiz is not in the active workspace. It may have been deleted.',
    backToLearning: 'Back to learning',
    noQuestionsTitle: 'This quiz has no questions',
    noQuestionsMessage:
      'The saved quiz does not contain any questions. Build a new quiz from your concepts.',
    buildAQuiz: 'Build a quiz',
    chooseAnswerFirst: 'Choose or write an answer first',
    quizComplete: 'Quiz complete',
    scoredMessage: (score: number, total: number) =>
      `You scored ${score} of ${total}. Mastery records were updated.`,
    couldNotSave: 'Could not save the attempt',
    backLearning: 'Learning',
    questionOf: (current: number, total: number) => `Question ${current} of ${total}`,
    answeredSummary: (answered: number, correct: number) =>
      `${answered} answered · ${correct} correct`,
    questionType: {
      'multiple-choice': 'multiple choice',
      'true-false': 'true false',
      'short-answer': 'short answer',
    },
    quizProgress: 'Quiz progress',
    chooseOneAnswer: 'Choose one answer',
    yourAnswer: 'Your answer',
    answerPlaceholder: 'Explain the concept in your own words…',
    shortAnswerHelper:
      'Short answers are checked by key-term overlap, not exact wording. The expected answer is shown after submission so you can verify the grade yourself.',
    correct: 'Correct',
    notQuite: 'Not quite',
    evidenceAttached: 'evidence attached',
    correctAnswer: 'Correct answer: ',
    evidence: 'Evidence',
    noSourceReference: 'No source reference is attached to this question.',
    keyboardHint: (max: number) => `Choose with 1–${max} on your keyboard.`,
    oneAttempt: 'One attempt per question.',
    checkAnswer: 'Check answer',
    finishQuiz: 'Finish quiz',
    nextQuestion: 'Next question',
    attemptStarted: (date: string) => `Attempt started ${date}`,
    exitWithoutSaving: 'Exit without saving',
    noTimer: 'No timer, no score pressure',
  },
  id: {
    notFoundTitle: 'Kuis tidak ditemukan',
    notFoundMessage:
      'Kuis ini tidak ada di ruang kerja aktif. Mungkin sudah dihapus.',
    backToLearning: 'Kembali ke pembelajaran',
    noQuestionsTitle: 'Kuis ini tidak memiliki pertanyaan',
    noQuestionsMessage:
      'Kuis yang tersimpan tidak berisi pertanyaan. Buat kuis baru dari konsep Anda.',
    buildAQuiz: 'Buat kuis',
    chooseAnswerFirst: 'Pilih atau tulis jawaban terlebih dahulu',
    quizComplete: 'Kuis selesai',
    scoredMessage: (score: number, total: number) =>
      `Skor Anda ${score} dari ${total}. Catatan penguasaan telah diperbarui.`,
    couldNotSave: 'Tidak dapat menyimpan percobaan',
    backLearning: 'Pembelajaran',
    questionOf: (current: number, total: number) => `Pertanyaan ${current} dari ${total}`,
    answeredSummary: (answered: number, correct: number) =>
      `${answered} dijawab · ${correct} benar`,
    questionType: {
      'multiple-choice': 'pilihan ganda',
      'true-false': 'benar salah',
      'short-answer': 'jawaban singkat',
    },
    quizProgress: 'Kemajuan kuis',
    chooseOneAnswer: 'Pilih satu jawaban',
    yourAnswer: 'Jawaban Anda',
    answerPlaceholder: 'Jelaskan konsep dengan kata-kata Anda sendiri…',
    shortAnswerHelper:
      'Jawaban singkat diperiksa berdasarkan irisan istilah kunci, bukan kata persisnya. Jawaban yang diharapkan ditampilkan setelah dikirim agar Anda dapat memverifikasi nilainya sendiri.',
    correct: 'Benar',
    notQuite: 'Belum tepat',
    evidenceAttached: 'bukti terlampir',
    correctAnswer: 'Jawaban benar: ',
    evidence: 'Bukti',
    noSourceReference: 'Tidak ada referensi sumber yang terlampir pada pertanyaan ini.',
    keyboardHint: (max: number) => `Pilih dengan 1–${max} di keyboard Anda.`,
    oneAttempt: 'Satu percobaan per pertanyaan.',
    checkAnswer: 'Periksa jawaban',
    finishQuiz: 'Selesaikan kuis',
    nextQuestion: 'Pertanyaan berikutnya',
    attemptStarted: (date: string) => `Percobaan dimulai ${date}`,
    exitWithoutSaving: 'Keluar tanpa menyimpan',
    noTimer: 'Tanpa batas waktu, tanpa tekanan skor',
  },
} as const;

export function QuizSessionPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const project = useWorkspaceStore((state) => state.activeProject);
  const recordAttempt = useWorkspaceStore((state) => state.recordAttempt);
  const c = useCopy(copy);
  const [index, setIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [startedAt] = useState(() => nowIso());
  const [finishing, setFinishing] = useState(false);

  const quiz = project?.quizzes.find((candidate) => candidate.id === quizId);
  const question = quiz?.questions[index];
  const isLast = quiz ? index === quiz.questions.length - 1 : false;
  const correct = question && submitted ? gradeAnswer(question, selectedAnswer) : false;
  const documents = useMemo(
    () => new Map(project?.documents.map((document) => [document.id, document]) ?? []),
    [project],
  );

  useEffect(() => {
    if (!question || submitted || !question.options) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1 && number <= question.options!.length) {
        setSelectedAnswer(question.options![number - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [question, submitted]);

  if (!project) {
    return <NoProjectPanel />;
  }

  if (!quiz) {
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

  if (!question) {
    return (
      <ErrorState
        title={c.noQuestionsTitle}
        message={c.noQuestionsMessage}
        action={
          <Link to="/learning/new" className={buttonClassName('primary', 'sm')}>
            {c.buildAQuiz}
          </Link>
        }
      />
    );
  }

  const submit = () => {
    if (!selectedAnswer.trim()) {
      toast.info(c.chooseAnswerFirst);
      return;
    }
    const answer: QuizAnswer = {
      questionId: question.id,
      ...(question.conceptId ? { conceptId: question.conceptId } : {}),
      answer: selectedAnswer,
      correct: gradeAnswer(question, selectedAnswer),
      answeredAt: nowIso(),
    };
    setAnswers((current) => [...current, answer]);
    setSubmitted(true);
  };

  const finish = async () => {
    setFinishing(true);
    const attempt: QuizAttempt = {
      id: newId('attempt'),
      projectId: project.projectId,
      quizId: quiz.id,
      quizTitle: quiz.title,
      startedAt,
      completedAt: nowIso(),
      answers,
      score: answers.filter((answer) => answer.correct).length,
      total: quiz.questions.length,
    };
    try {
      await recordAttempt(attempt);
      toast.success(
        c.quizComplete,
        c.scoredMessage(attempt.score, attempt.total),
      );
      navigate(`/learning/quiz/${quiz.id}/results/${attempt.id}`, { replace: true });
    } catch (error) {
      toast.error(c.couldNotSave, errorMessage(error));
    } finally {
      setFinishing(false);
    }
  };

  const next = () => {
    if (isLast) {
      void finish();
      return;
    }
    setIndex((current) => current + 1);
    setSelectedAnswer('');
    setSubmitted(false);
  };

  const score = answers.filter((answer) => answer.correct).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/learning" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-200">
          <ArrowLeft className="h-3.5 w-3.5" /> {c.backLearning}
        </Link>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <FeatureOrb variant="quiz" size={54} />
          <span>{quiz.title}</span>
          <Badge variant={quiz.source === 'rules' ? 'cyan' : 'violet'}>{quiz.source}</Badge>
        </div>
      </div>

      <div className="surface rounded-2xl p-5 sm:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300/80">
              {c.questionOf(index + 1, quiz.questions.length)}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-600">
              {c.answeredSummary(answers.length, score)}
            </p>
          </div>
          <Badge variant="outline">
            {c.questionType[question.type]}
          </Badge>
        </div>
        <ProgressBar
          value={index + (submitted ? 1 : 0)}
          max={quiz.questions.length}
          label={c.quizProgress}
        />

        <h1 className="mt-6 whitespace-pre-wrap text-lg font-semibold leading-relaxed tracking-[-0.01em] text-bright sm:text-xl">
          {question.prompt}
        </h1>

        <div className="mt-5">
          {question.options ? (
            <fieldset>
              <legend className="sr-only">{c.chooseOneAnswer}</legend>
              <div className="space-y-2">
                {question.options.map((option, optionIndex) => {
                  const selected = selectedAnswer === option;
                  const correctOption = option === question.correctAnswer;
                  return (
                    <label
                      key={option}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors',
                        submitted && correctOption
                          ? 'border-emerald-400/35 bg-emerald-400/[0.06] text-emerald-100'
                          : submitted && selected && !correctOption
                            ? 'border-rose-400/35 bg-rose-400/[0.06] text-rose-100'
                            : selected
                              ? 'border-cyan-400/35 bg-cyan-400/[0.05] text-cyan-50'
                              : 'border-line-soft bg-white/[0.015] text-slate-300 hover:border-slate-500/50',
                        submitted && 'cursor-default',
                      )}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        className="h-4 w-4 accent-cyan-400"
                        checked={selected}
                        disabled={submitted}
                        onChange={() => setSelectedAnswer(option)}
                      />
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-white/10 bg-black/20 font-mono text-[10px] text-slate-400">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="min-w-0 flex-1">{option}</span>
                      {submitted && correctOption ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                      ) : submitted && selected ? (
                        <XCircle className="h-4 w-4 shrink-0 text-rose-300" />
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <div>
              <label htmlFor="short-answer" className="mb-1.5 block text-[10px] uppercase tracking-[0.1em] text-slate-500">
                {c.yourAnswer}
              </label>
              <Textarea
                id="short-answer"
                value={selectedAnswer}
                onChange={(event) => setSelectedAnswer(event.target.value)}
                rows={5}
                disabled={submitted}
                placeholder={c.answerPlaceholder}
                maxLength={5000}
              />
              <p className="mt-1.5 text-[10px] text-slate-600">
                {c.shortAnswerHelper}
              </p>
            </div>
          )}
        </div>

        {submitted ? (
          <div
            className={cn(
              'mt-5 rounded-xl border p-4',
              correct
                ? 'border-emerald-400/25 bg-emerald-400/[0.04]'
                : 'border-rose-400/25 bg-rose-400/[0.04]',
            )}
            role="status"
          >
            <div className="flex items-center gap-2">
              {correct ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-300" />
              )}
              <p className={cn('text-sm font-semibold', correct ? 'text-emerald-200' : 'text-rose-200')}>
                {correct ? c.correct : c.notQuite}
              </p>
              {question.sourceReferences.length > 0 ? (
                <Badge variant="outline" className="ml-auto">
                  {c.evidenceAttached}
                </Badge>
              ) : null}
            </div>
            {!correct ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                <span className="text-slate-500">{c.correctAnswer}</span>
                {question.correctAnswer}
              </p>
            ) : null}
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">
              {question.explanation}
            </p>
            {question.sourceReferences.length > 0 ? (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {c.evidence}
                </p>
                <ul className="space-y-1.5">
                  {question.sourceReferences.map((reference) => {
                    const document = documents.get(reference.documentId);
                    return (
                      <li key={reference.id} className="rounded-lg border border-line-soft bg-black/15 p-2">
                        <Link
                          to={document ? sourceHref(reference, document) : '#'}
                          className="flex items-center gap-1.5 text-[10px] font-medium text-cyan-300 hover:text-cyan-200"
                        >
                          <BookOpen className="h-3 w-3" />
                          {sourceLabel(reference, document)}
                        </Link>
                        <p className="mt-1 line-clamp-3 text-[10px] leading-relaxed text-slate-500">
                          “{reference.excerpt}”
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-[10px] text-slate-600">
                {c.noSourceReference}
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
          <p className="flex items-center gap-1.5 text-[10px] text-slate-600">
            {question.options ? (
              <>
                <CircleHelp className="h-3 w-3" /> {c.keyboardHint(question.options.length)}
              </>
            ) : (
              <>
                <CircleHelp className="h-3 w-3" /> {c.oneAttempt}
              </>
            )}
          </p>
          {!submitted ? (
            <Button
              variant="primary"
              onClick={submit}
              disabled={!selectedAnswer.trim()}
              rightIcon={<Check className="h-4 w-4" />}
            >
              {c.checkAnswer}
            </Button>
          ) : isLast ? (
            <Button
              variant="primary"
              onClick={finish}
              loading={finishing}
              leftIcon={<Flag className="h-4 w-4" />}
            >
              {c.finishQuiz}
            </Button>
          ) : (
            <Button variant="primary" onClick={next} rightIcon={<ArrowRight className="h-4 w-4" />}>
              {c.nextQuestion}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600">
        <span>{c.attemptStarted(formatDate(startedAt, true))}</span>
        <Link to="/learning" className="inline-flex items-center gap-1 hover:text-slate-300">
          <RotateCcw className="h-3 w-3" /> {c.exitWithoutSaving}
        </Link>
        <span className="inline-flex items-center gap-1">
          <X className="h-3 w-3" /> {c.noTimer}
        </span>
      </div>
    </div>
  );
}
