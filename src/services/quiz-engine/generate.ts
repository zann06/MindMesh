import type {
  Concept,
  KnowledgeProject,
  QuestionType,
  Quiz,
  QuizQuestion,
  Relationship,
  SourceReference,
} from '@/core/domain/types';
import { relationMetaFor } from '@/app/relation-copy';
import { getLanguage, type Language } from '@/app/language-store';
import { newId, nowIso } from '@/lib/utils';

export interface GenerateQuizOptions {
  projectId: string;
  title: string;
  concepts: Concept[];
  allConcepts: Concept[];
  relationships: Relationship[];
  types: QuestionType[];
  maxQuestions: number;
  random?: () => number;
  language?: Language;
}

export interface GenerateQuizResult {
  quiz: Quiz;
  warnings: string[];
}

const copy = {
  en: {
    matchDescription: (description: string) =>
      `Which concept matches this description?\n\n“${description}”`,
    described: (label: string, description: string) =>
      `${label} is described as: ${description}`,
    statement: (source: string, relation: string, target: string) =>
      `In this project, “${source}” ${relation} “${target}”.`,
    trueOptions: ['True', 'False'],
    records: (source: string, relation: string, target: string) =>
      `The project records this relationship: ${source} ${relation} ${target}.`,
    recordsNot: (source: string, relation: string, target: string, wrong: string) =>
      `The project records “${source}” ${relation} “${target}”, not “${wrong}”. This statement is false within the current project graph.`,
    explain: (label: string) => `Explain “${label}” in your own words.`,
    expected: (description: string) => `Expected ideas: ${description}`,
    practiceQuiz: 'Practice quiz',
    quizDescription: (count: number) =>
      `Generated from ${count} selected concept${count === 1 ? '' : 's'} using local rules. No AI provider involved.`,
    warnings: {
      multipleChoice:
        'Multiple-choice questions need at least three concepts with descriptions. None were generated.',
      trueFalse:
        'True/false questions need relationships between the selected concepts. None were generated.',
      shortAnswer:
        'Short-answer questions need concept descriptions of at least 20 characters. None were generated.',
    },
  },
  id: {
    matchDescription: (description: string) =>
      `Konsep mana yang cocok dengan deskripsi ini?\n\n“${description}”`,
    described: (label: string, description: string) =>
      `${label} dijelaskan sebagai: ${description}`,
    statement: (source: string, relation: string, target: string) =>
      `Dalam proyek ini, “${source}” ${relation} “${target}”.`,
    trueOptions: ['Benar', 'Salah'],
    records: (source: string, relation: string, target: string) =>
      `Proyek mencatat relasi ini: ${source} ${relation} ${target}.`,
    recordsNot: (source: string, relation: string, target: string, wrong: string) =>
      `Proyek mencatat “${source}” ${relation} “${target}”, bukan “${wrong}”. Pernyataan ini salah dalam graf proyek saat ini.`,
    explain: (label: string) => `Jelaskan “${label}” dengan kata-kata Anda sendiri.`,
    expected: (description: string) => `Ide yang diharapkan: ${description}`,
    practiceQuiz: 'Kuis latihan',
    quizDescription: (count: number) =>
      `Dibuat dari ${count} konsep terpilih menggunakan aturan lokal. Tidak ada penyedia AI yang terlibat.`,
    warnings: {
      multipleChoice:
        'Pertanyaan pilihan ganda memerlukan setidaknya tiga konsep berdeskripsi. Tidak ada yang dibuat.',
      trueFalse:
        'Pertanyaan benar/salah memerlukan relasi antar konsep terpilih. Tidak ada yang dibuat.',
      shortAnswer:
        'Pertanyaan jawaban singkat memerlukan deskripsi konsep minimal 20 karakter. Tidak ada yang dibuat.',
    },
  },
} as const;

type QuizCopy = (typeof copy)[Language];

function shuffle<T>(values: T[], random: () => number): T[] {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function uniqueReferences(references: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = `${reference.documentId}:${reference.startOffset}:${reference.excerpt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function conceptReferences(concept: Concept): SourceReference[] {
  return uniqueReferences(concept.sourceReferences).slice(0, 2);
}

function relationshipReferences(
  relationship: Relationship,
  source: Concept,
  target: Concept,
): SourceReference[] {
  return uniqueReferences([
    ...relationship.sourceReferences,
    ...source.sourceReferences,
    ...target.sourceReferences,
  ]).slice(0, 2);
}

function shortDescription(concept: Concept, max = 340): string {
  const description = concept.description.trim();
  if (description.length <= max) return description;
  return `${description.slice(0, max - 1).trim()}…`;
}

function descriptionQuestion(
  concept: Concept,
  allConcepts: Concept[],
  random: () => number,
  t: QuizCopy,
): QuizQuestion | null {
  const description = shortDescription(concept);
  if (description.length < 20) return null;
  const distractors = allConcepts
    .filter((candidate) => candidate.id !== concept.id)
    .map((candidate) => candidate.label.trim())
    .filter((label) => label && label.toLowerCase() !== concept.label.toLowerCase());
  if (distractors.length < 2) return null;
  const picked = shuffle(distractors, random).slice(0, 3);
  return {
    id: newId('q'),
    conceptId: concept.id,
    type: 'multiple-choice',
    prompt: t.matchDescription(description),
    options: shuffle([concept.label, ...picked], random),
    correctAnswer: concept.label,
    explanation: t.described(concept.label, description),
    sourceReferences: conceptReferences(concept),
  };
}

function relationshipStatement(
  relationship: Relationship,
  source: Concept,
  target: Concept,
  language: Language,
  t: QuizCopy,
): string {
  const meta = relationMetaFor(relationship.relationType, language);
  return t.statement(source.label, meta.label.toLowerCase(), target.label);
}

function trueFalseQuestion(
  relationship: Relationship,
  relationships: Relationship[],
  concepts: Concept[],
  random: () => number,
  language: Language,
  t: QuizCopy,
): QuizQuestion | null {
  const source = concepts.find((concept) => concept.id === relationship.sourceConceptId);
  const target = concepts.find((concept) => concept.id === relationship.targetConceptId);
  if (!source || !target) return null;
  const meta = relationMetaFor(relationship.relationType, language);
  const relation = meta.label.toLowerCase();
  const [trueLabel, falseLabel] = t.trueOptions;
  const makeTrue = random() < 0.5;
  if (!makeTrue) {
    const wrongTargets = concepts.filter(
      (concept) =>
        concept.id !== relationship.targetConceptId &&
        concept.id !== relationship.sourceConceptId &&
        !relationships.some(
          (candidate) =>
            candidate.sourceConceptId === relationship.sourceConceptId &&
            candidate.targetConceptId === concept.id &&
            candidate.relationType === relationship.relationType,
        ),
    );
    if (wrongTargets.length === 0) {
      return {
        id: newId('q'),
        conceptId: relationship.sourceConceptId,
        type: 'true-false',
        prompt: relationshipStatement(relationship, source, target, language, t),
        options: [...t.trueOptions],
        correctAnswer: trueLabel,
        explanation: t.records(source.label, relation, target.label),
        sourceReferences: relationshipReferences(relationship, source, target),
      };
    }
    const wrongTarget = shuffle(wrongTargets, random)[0];
    return {
      id: newId('q'),
      conceptId: relationship.sourceConceptId,
      type: 'true-false',
      prompt: t.statement(source.label, relation, wrongTarget.label),
      options: [...t.trueOptions],
      correctAnswer: falseLabel,
      explanation: t.recordsNot(source.label, relation, target.label, wrongTarget.label),
      sourceReferences: relationshipReferences(relationship, source, target),
    };
  }
  return {
    id: newId('q'),
    conceptId: relationship.sourceConceptId,
    type: 'true-false',
    prompt: relationshipStatement(relationship, source, target, language, t),
    options: [...t.trueOptions],
    correctAnswer: trueLabel,
    explanation: t.records(source.label, relation, target.label),
    sourceReferences: relationshipReferences(relationship, source, target),
  };
}

function shortAnswerQuestion(concept: Concept, t: QuizCopy): QuizQuestion | null {
  const description = concept.description.trim();
  if (description.length < 20) return null;
  return {
    id: newId('q'),
    conceptId: concept.id,
    type: 'short-answer',
    prompt: t.explain(concept.label),
    correctAnswer: description,
    explanation: t.expected(description),
    sourceReferences: conceptReferences(concept),
  };
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'that',
  'with',
  'this',
  'from',
  'into',
  'when',
  'where',
  'what',
  'which',
  'while',
  'have',
  'has',
  'are',
  'was',
  'were',
  'not',
  'but',
  'its',
  'their',
  'they',
  'them',
  'then',
  'than',
  'also',
  'can',
  'will',
  'would',
  'could',
  'should',
  'about',
  'because',
  'through',
  'between',
  'using',
  'used',
  'one',
  'two',
  'more',
  'most',
  'your',
  'you',
  'our',
  'all',
  'any',
  'each',
  'other',
  'some',
  'such',
  'only',
  'over',
  'under',
  'these',
  'those',
]);

export function extractKeyTerms(value: string): string[] {
  return [
    ...new Set(
      value
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
    ),
  ];
}

export function gradeShortAnswer(question: QuizQuestion, answer: string): boolean {
  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedCorrect = normalizeAnswer(question.correctAnswer);
  if (!normalizedAnswer) return false;
  if (normalizedAnswer === normalizedCorrect) return true;
  if (normalizedCorrect.includes(normalizedAnswer) && normalizedAnswer.length >= 12) return true;
  if (
    question.acceptedAnswers?.some(
      (accepted) => normalizeAnswer(accepted).length > 2 && normalizedAnswer.includes(normalizeAnswer(accepted)),
    )
  ) {
    return true;
  }
  const keyTerms = extractKeyTerms(question.correctAnswer);
  if (keyTerms.length === 0) return false;
  const answerTerms = new Set(extractKeyTerms(answer));
  const matched = keyTerms.filter((term) =>
    [...answerTerms].some(
      (candidate) => candidate === term || candidate.includes(term) || term.includes(candidate),
    ),
  ).length;
  const required = keyTerms.length <= 2 ? 1 : Math.ceil(keyTerms.length * 0.4);
  return matched >= required;
}

export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function gradeAnswer(question: QuizQuestion, answer: string): boolean {
  if (question.type === 'short-answer') return gradeShortAnswer(question, answer);
  return normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer);
}

export function generateQuiz(options: GenerateQuizOptions): GenerateQuizResult {
  const random = options.random ?? Math.random;
  const language = options.language ?? getLanguage();
  const t = copy[language] as QuizCopy;
  const warnings: string[] = [];
  const selectedIds = new Set(options.concepts.map((concept) => concept.id));
  const relationships = options.relationships.filter(
    (relationship) =>
      selectedIds.has(relationship.sourceConceptId) && selectedIds.has(relationship.targetConceptId),
  );
  const concepts = shuffle(options.concepts, random);
  const candidates = new Map<QuestionType, QuizQuestion[]>();

  if (options.types.includes('multiple-choice')) {
    const mock = concepts
      .map((concept) => descriptionQuestion(concept, options.allConcepts, random, t))
      .filter((question): question is QuizQuestion => Boolean(question));
    candidates.set('multiple-choice', mock);
    if (mock.length === 0) {
      warnings.push(t.warnings.multipleChoice);
    }
  }

  if (options.types.includes('true-false')) {
    const statements = shuffle(relationships, random)
      .map((relationship) =>
        trueFalseQuestion(relationship, relationships, options.allConcepts, random, language, t),
      )
      .filter((question): question is QuizQuestion => Boolean(question));
    candidates.set('true-false', statements);
    if (statements.length === 0) {
      warnings.push(t.warnings.trueFalse);
    }
  }

  if (options.types.includes('short-answer')) {
    const prompts = concepts
      .map((concept) => shortAnswerQuestion(concept, t))
      .filter((question): question is QuizQuestion => Boolean(question));
    candidates.set('short-answer', prompts);
    if (prompts.length === 0) {
      warnings.push(t.warnings.shortAnswer);
    }
  }

  const pool = [...candidates.values()];
  const questions: QuizQuestion[] = [];
  const usedPrompts = new Set<string>();
  let cursor = 0;
  while (questions.length < options.maxQuestions && pool.some((list) => list.length > 0)) {
    let added = false;
    for (let offset = 0; offset < pool.length; offset += 1) {
      const list = pool[(cursor + offset) % pool.length];
      while (list.length > 0) {
        const question = list.shift()!;
        if (usedPrompts.has(question.prompt)) continue;
        usedPrompts.add(question.prompt);
        questions.push(question);
        added = true;
        break;
      }
      if (questions.length >= options.maxQuestions) break;
    }
    cursor += 1;
    if (!added) break;
  }

  const quiz: Quiz = {
    id: newId('quiz'),
    projectId: options.projectId,
    title: options.title.trim() || t.practiceQuiz,
    description: t.quizDescription(options.concepts.length),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    source: 'rules',
    questions,
  };
  return { quiz, warnings };
}

export function quizFromProject(
  project: KnowledgeProject,
  options: Omit<GenerateQuizOptions, 'projectId' | 'allConcepts' | 'relationships'>,
): GenerateQuizResult {
  return generateQuiz({
    ...options,
    projectId: project.projectId,
    allConcepts: project.concepts,
    relationships: project.relationships,
  });
}
