import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckSquare,
  CircleHelp,
  FileQuestion,
  ListChecks,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { useCopy, useLanguageStore, type Widen } from '@/app/language-store';
import { toast } from '@/app/toast-store';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonClassName } from '@/components/ui/button-styles';
import { Input, Select } from '@/components/ui/form';
import { EmptyState, Notice } from '@/components/ui/states';
import { NoProjectPanel } from '@/components/layout/no-project';
import { quizFromProject } from '@/services/quiz-engine/generate';
import type { QuestionType } from '@/core/domain/types';
import { cn, errorMessage } from '@/lib/utils';

const TYPE_META: Array<{
  type: QuestionType;
  icon: typeof CircleHelp;
}> = [
  {
    type: 'multiple-choice',
    icon: ListChecks,
  },
  {
    type: 'true-false',
    icon: CheckSquare,
  },
  {
    type: 'short-answer',
    icon: FileQuestion,
  },
];

const copy = {
  en: {
    title: 'Build a quiz',
    noProjectDescription: 'Generate a quiz from your concepts.',
    backLearning: 'Learning',
    eyebrow: 'Rule-based generation',
    description:
      'Choose the concepts and question formats. Questions are derived only from stored descriptions and relationships; no AI provider is used.',
    noAi: 'no AI',
    emptyTitle: 'No concepts to practice',
    emptyDescription: 'Create concepts or import the sample project before generating a quiz.',
    openUniverse: 'Open universe',
    concepts: 'Concepts',
    selectedCount: (count: number) => `${count} selected`,
    selectVisible: 'Select visible',
    clear: 'Clear',
    filterConcepts: 'Filter concepts',
    filterPlaceholder: 'Filter concepts…',
    chars: (count: number) => `${count} chars`,
    noDescription: 'no description',
    sourceCount: (count: number) => `${count} source`,
    noMatch: 'No concepts match that filter.',
    questionFormats: 'Question formats',
    typeInfo: {
      'multiple-choice': {
        title: 'Multiple choice',
        description:
          'Match a concept to its recorded description. Needs at least 3 described concepts.',
      },
      'true-false': {
        title: 'True / false',
        description:
          'Test relationship statements against the current graph. Needs relationships.',
      },
      'short-answer': {
        title: 'Short answer',
        description: 'Explain a concept in your own words. Graded by key-term overlap.',
      },
    },
    describedConcepts: (count: number) =>
      `described concept${count === 1 ? '' : 's'}`,
    internalRelationships: (count: number) =>
      `internal relationship${count === 1 ? '' : 's'}`,
    sourceDocuments: (count: number) =>
      `source document${count === 1 ? '' : 's'}`,
    generate: 'Generate',
    quizTitle: 'Quiz title',
    questionCount: 'Question count',
    upToQuestions: (count: number) => `Up to ${count} questions`,
    cannotGenerate: 'Cannot generate',
    selectConceptError: 'Select at least one concept.',
    selectTypeError: 'Select at least one question type.',
    notEnoughError:
      'Not enough descriptions or relationships were selected to create questions.',
    noDescriptionsNotice:
      'Selected concepts have no descriptions. Add descriptions to enable multiple-choice and short-answer questions.',
    generateAndStart: 'Generate and start',
    generationParagraph:
      'Generation is deterministic in structure but shuffles option order. Every question stores its source references when available. Nothing is sent to a server.',
    conceptsSelected: (count: number) => `${count} concepts selected`,
    upToCount: (count: number) => `up to ${count} questions`,
    generationNote: 'Generation note',
    quizGenerated: 'Quiz generated',
    questionsFromRules: (count: number) =>
      `${count} question${count === 1 ? '' : 's'} from local rules.`,
    defaultQuizTitle: 'Practice quiz',
  },
  id: {
    title: 'Buat kuis',
    noProjectDescription: 'Buat kuis dari konsep Anda.',
    backLearning: 'Pembelajaran',
    eyebrow: 'Pembuatan berbasis aturan',
    description:
      'Pilih konsep dan format pertanyaan. Pertanyaan hanya diturunkan dari deskripsi dan relasi yang tersimpan; tidak ada penyedia AI yang digunakan.',
    noAi: 'tanpa AI',
    emptyTitle: 'Belum ada konsep untuk dilatih',
    emptyDescription: 'Buat konsep atau impor proyek contoh sebelum membuat kuis.',
    openUniverse: 'Buka semesta',
    concepts: 'Konsep',
    selectedCount: (count: number) => `${count} dipilih`,
    selectVisible: 'Pilih yang terlihat',
    clear: 'Bersihkan',
    filterConcepts: 'Filter konsep',
    filterPlaceholder: 'Filter konsep…',
    chars: (count: number) => `${count} karakter`,
    noDescription: 'tanpa deskripsi',
    sourceCount: (count: number) => `${count} sumber`,
    noMatch: 'Tidak ada konsep yang cocok dengan filter tersebut.',
    questionFormats: 'Format pertanyaan',
    typeInfo: {
      'multiple-choice': {
        title: 'Pilihan ganda',
        description:
          'Cocokkan konsep dengan deskripsi yang tersimpan. Butuh minimal 3 konsep berdeskripsi.',
      },
      'true-false': {
        title: 'Benar / salah',
        description:
          'Uji pernyataan relasi terhadap grafik saat ini. Butuh relasi.',
      },
      'short-answer': {
        title: 'Jawaban singkat',
        description: 'Jelaskan konsep dengan kata-kata sendiri. Dinilai dari irisan istilah kunci.',
      },
    },
    describedConcepts: (_count: number) => 'konsep berdeskripsi',
    internalRelationships: (_count: number) => 'relasi internal',
    sourceDocuments: (_count: number) => 'dokumen sumber',
    generate: 'Buat',
    quizTitle: 'Judul kuis',
    questionCount: 'Jumlah pertanyaan',
    upToQuestions: (count: number) => `Hingga ${count} pertanyaan`,
    cannotGenerate: 'Tidak dapat membuat',
    selectConceptError: 'Pilih setidaknya satu konsep.',
    selectTypeError: 'Pilih setidaknya satu jenis pertanyaan.',
    notEnoughError:
      'Deskripsi atau relasi yang dipilih tidak cukup untuk membuat pertanyaan.',
    noDescriptionsNotice:
      'Konsep yang dipilih tidak memiliki deskripsi. Tambahkan deskripsi untuk mengaktifkan pertanyaan pilihan ganda dan jawaban singkat.',
    generateAndStart: 'Buat dan mulai',
    generationParagraph:
      'Pembuatan bersifat deterministik dalam struktur tetapi mengacak urutan opsi. Setiap pertanyaan menyimpan referensi sumbernya bila tersedia. Tidak ada yang dikirim ke server.',
    conceptsSelected: (count: number) => `${count} konsep dipilih`,
    upToCount: (count: number) => `hingga ${count} pertanyaan`,
    generationNote: 'Catatan pembuatan',
    quizGenerated: 'Kuis dibuat',
    questionsFromRules: (count: number) => `${count} pertanyaan dari aturan lokal.`,
    defaultQuizTitle: 'Kuis latihan',
  },
} as const;

type CopyShape = Widen<(typeof copy)[keyof typeof copy]>;

function typeInfoFor(c: CopyShape) {
  return TYPE_META.map((info) => ({ ...info, ...c.typeInfo[info.type] }));
}

export function QuizBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const project = useWorkspaceStore((state) => state.activeProject);
  const saveQuiz = useWorkspaceStore((state) => state.saveQuiz);
  const language = useLanguageStore((state) => state.language);
  const c = useCopy(copy);
  const typeInfo = typeInfoFor(c);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const requested = (searchParams.get('concepts') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const available = project?.concepts ?? [];
    const valid = requested.filter((id) => available.some((concept) => concept.id === id));
    return new Set(valid.length > 0 ? valid : available.map((concept) => concept.id));
  });
  const [types, setTypes] = useState<Record<QuestionType, boolean>>({
    'multiple-choice': true,
    'true-false': true,
    'short-answer': true,
  });
  const [title, setTitle] = useState(c.defaultQuizTitle);
  const [count, setCount] = useState(10);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedConcepts = useMemo(
    () => project?.concepts.filter((concept) => selected.has(concept.id)) ?? [],
    [project, selected],
  );
  const filteredConcepts = useMemo(() => {
    if (!project) return [];
    const normalized = query.trim().toLowerCase();
    return project.concepts.filter(
      (concept) =>
        !normalized ||
        [concept.label, concept.description, ...concept.tags, ...concept.aliases]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
    );
  }, [project, query]);
  const selectedRelationships = useMemo(() => {
    if (!project) return [];
    const ids = new Set(selectedConcepts.map((concept) => concept.id));
    return project.relationships.filter(
      (relationship) =>
        ids.has(relationship.sourceConceptId) && ids.has(relationship.targetConceptId),
    );
  }, [project, selectedConcepts]);
  const described = selectedConcepts.filter((concept) => concept.description.trim().length >= 20).length;

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader title={c.title} description={c.noProjectDescription} orb="quiz" />
        <NoProjectPanel />
      </div>
    );
  }

  const toggleConcept = (conceptId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(conceptId)) next.delete(conceptId);
      else next.add(conceptId);
      return next;
    });
  };

  const toggleType = (type: QuestionType) => {
    setTypes((current) => ({ ...current, [type]: !current[type] }));
  };

  const generate = async () => {
    setError(null);
    if (selectedConcepts.length === 0) {
      setError(c.selectConceptError);
      return;
    }
    const enabledTypes = typeInfo.map((info) => info.type).filter((type) => types[type]);
    if (enabledTypes.length === 0) {
      setError(c.selectTypeError);
      return;
    }
    setBusy(true);
    try {
      const { quiz, warnings } = quizFromProject(project, {
        title,
        concepts: selectedConcepts,
        types: enabledTypes,
        maxQuestions: count,
        language,
      });
      if (quiz.questions.length === 0) {
        setError(
          warnings.length > 0
            ? warnings.join(' ')
            : c.notEnoughError,
        );
        return;
      }
      await saveQuiz(quiz);
      if (warnings.length > 0) {
        for (const warning of warnings.slice(0, 2)) toast.info(c.generationNote, warning);
      }
      toast.success(
        c.quizGenerated,
        c.questionsFromRules(quiz.questions.length),
      );
      navigate(`/learning/quiz/${quiz.id}`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/learning" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-200">
        <ArrowLeft className="h-3.5 w-3.5" /> {c.backLearning}
      </Link>

      <PageHeader
        eyebrow={c.eyebrow}
        title={c.title}
        description={c.description}
        orb="quiz"
        actions={<Badge variant="cyan">{c.noAi}</Badge>}
      />

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
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <section className="surface rounded-xl p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-bright">
                  {c.concepts}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {c.selectedCount(selectedConcepts.length)}
                  </span>
                </h2>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(new Set(filteredConcepts.map((concept) => concept.id)))}
                  >
                    {c.selectVisible}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                    {c.clear}
                  </Button>
                </div>
              </div>
              <label className="relative mb-3 block">
                <span className="sr-only">{c.filterConcepts}</span>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={c.filterPlaceholder}
                  className="h-9 text-xs"
                />
              </label>
              <ul className="grid max-h-[420px] gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredConcepts.map((concept) => (
                  <li key={concept.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors',
                        selected.has(concept.id)
                          ? 'border-cyan-400/25 bg-cyan-400/[0.035]'
                          : 'border-line-soft bg-white/[0.01] hover:border-slate-500/40',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 accent-cyan-400"
                        checked={selected.has(concept.id)}
                        onChange={() => toggleConcept(concept.id)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-medium text-slate-200">
                          {concept.label}
                        </span>
                        <span className="mt-0.5 block text-[9px] text-slate-600">
                          {concept.description ? c.chars(concept.description.length) : c.noDescription}
                          {concept.sourceReferences.length > 0
                            ? ` · ${c.sourceCount(concept.sourceReferences.length)}`
                            : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {filteredConcepts.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">{c.noMatch}</p>
              ) : null}
            </section>

            <section className="surface rounded-xl p-4">
              <h2 className="mb-3 text-sm font-semibold text-bright">{c.questionFormats}</h2>
              <div className="grid gap-2 sm:grid-cols-3">
                {typeInfo.map((info) => {
                  const Icon = info.icon;
                  return (
                    <label
                      key={info.type}
                      className={cn(
                        'cursor-pointer rounded-xl border p-3 transition-colors',
                        types[info.type]
                          ? 'border-violet-400/25 bg-violet-400/[0.035]'
                          : 'border-line-soft bg-white/[0.01]',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 accent-violet-400"
                          checked={types[info.type]}
                          onChange={() => toggleType(info.type)}
                        />
                        <Icon className="mt-0.5 h-3.5 w-3.5 text-violet-300" />
                        <div>
                          <p className="text-[11px] font-medium text-slate-200">{info.title}</p>
                          <p className="mt-1 text-[9px] leading-relaxed text-slate-500">{info.description}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 grid gap-2 text-[10px] text-slate-500 sm:grid-cols-3">
                <p>
                  <span className="text-slate-300">{described}</span>{' '}
                  {c.describedConcepts(described)}
                </p>
                <p>
                  <span className="text-slate-300">{selectedRelationships.length}</span>{' '}
                  {c.internalRelationships(selectedRelationships.length)}
                </p>
                <p>
                  <span className="text-slate-300">{project.documents.length}</span>{' '}
                  {c.sourceDocuments(project.documents.length)}
                </p>
              </div>
            </section>
          </div>

          <aside className="surface rounded-xl p-4 xl:sticky xl:top-20">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-bright">
              <Wand2 className="h-4 w-4 text-violet-300" /> {c.generate}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-slate-500">{c.quizTitle}</span>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-slate-500">{c.questionCount}</span>
                <Select value={count} onChange={(event) => setCount(Number(event.target.value))}>
                  {[5, 10, 15, 20].map((value) => (
                    <option key={value} value={value}>
                      {c.upToQuestions(value)}
                    </option>
                  ))}
                </Select>
              </label>

              {error ? (
                <Notice tone="error" title={c.cannotGenerate}>
                  {error}
                </Notice>
              ) : null}
              {described === 0 ? (
                <Notice tone="info">
                  {c.noDescriptionsNotice}
                </Notice>
              ) : null}

              <Button
                variant="primary"
                className="w-full"
                leftIcon={<Sparkles className="h-4 w-4" />}
                loading={busy}
                onClick={generate}
                disabled={selectedConcepts.length === 0}
              >
                {c.generateAndStart}
              </Button>
              <p className="text-[9px] leading-relaxed text-slate-600">
                {c.generationParagraph}
              </p>
              <div className="flex items-center justify-between border-t border-line-soft pt-3 text-[10px] text-slate-500">
                <span>{c.conceptsSelected(selectedConcepts.length)}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{c.upToCount(count)}</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
