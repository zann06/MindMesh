import { describe, expect, it } from 'vitest';
import {
  createConcept,
  createEmptyProject,
  createRelationship,
} from '@/core/domain/factory';
import {
  extractKeyTerms,
  generateQuiz,
  gradeAnswer,
  gradeShortAnswer,
  normalizeAnswer,
  quizFromProject,
} from '@/services/quiz-engine/generate';
import type { Concept, KnowledgeProject, QuizQuestion } from '@/core/domain/types';

const DESCRIPTIONS = [
  'Active recall strengthens memory by retrieving information without looking at the answer.',
  'Spaced repetition schedules reviews at increasing intervals to slow forgetting.',
  'Interleaving mixes related topics so learners practise choosing the right strategy.',
  'Elaboration connects new ideas to prior knowledge by explaining why and how they relate.',
];

function fixture(): { project: KnowledgeProject; concepts: Concept[] } {
  const base = createEmptyProject('Quiz test');
  const concepts = DESCRIPTIONS.map((description, index) =>
    createConcept(base.projectId, {
      label: `Concept ${String.fromCharCode(65 + index)}`,
      description,
      tags: ['Learning'],
    }),
  );
  let project = { ...base, concepts };
  for (let index = 0; index < concepts.length - 1; index += 1) {
    project = {
      ...project,
      relationships: [
        ...project.relationships,
        createRelationship(project.projectId, {
          sourceConceptId: concepts[index].id,
          targetConceptId: concepts[index + 1].id,
          relationType: index % 2 === 0 ? 'prerequisite' : 'related-to',
          explanation: 'Fixture relationship',
        }),
      ],
    };
  }
  return { project, concepts };
}

function randomSequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('answer normalization and grading', () => {
  it('normalizes case, accents, punctuation, and whitespace', () => {
    expect(normalizeAnswer('  Café—Déjà Vu! ')).toBe('cafe deja vu');
    expect(normalizeAnswer('A  B\nC')).toBe('a b c');
  });

  it('grades choices case-insensitively', () => {
    const question: QuizQuestion = {
      id: 'q1',
      type: 'multiple-choice',
      prompt: 'Pick one',
      options: ['Alpha', 'Beta'],
      correctAnswer: 'Alpha',
      explanation: '',
      sourceReferences: [],
    };
    expect(gradeAnswer(question, ' alpha ')).toBe(true);
    expect(gradeAnswer(question, 'Beta')).toBe(false);
  });

  it('accepts configured short-answer alternatives', () => {
    const question: QuizQuestion = {
      id: 'q1',
      type: 'short-answer',
      prompt: 'Define it',
      correctAnswer: 'Retrieval practice strengthens memory.',
      acceptedAnswers: ['active recall'],
      explanation: '',
      sourceReferences: [],
    };
    expect(gradeShortAnswer(question, 'Active recall')).toBe(true);
    expect(gradeShortAnswer(question, '')).toBe(false);
  });

  it('grades short answers using key-term overlap', () => {
    const question: QuizQuestion = {
      id: 'q1',
      type: 'short-answer',
      prompt: 'Explain spaced repetition',
      correctAnswer: 'Spaced repetition schedules reviews at increasing intervals to slow forgetting.',
      explanation: '',
      sourceReferences: [],
    };
    expect(
      gradeShortAnswer(question, 'It schedules reviews at increasing intervals to slow forgetting'),
    ).toBe(true);
    expect(gradeShortAnswer(question, 'Completely unrelated words about weather')).toBe(false);
  });

  it('removes stop words and duplicates from key terms', () => {
    const terms = extractKeyTerms('The memory and the memory of a retrieval practice');
    expect(terms).toContain('memory');
    expect(terms).toContain('retrieval');
    expect(terms).toContain('practice');
    expect(terms).not.toContain('the');
    expect(terms.filter((term) => term === 'memory')).toHaveLength(1);
  });
});

describe('rule-based quiz generation', () => {
  it('creates a mixed quiz from selected concepts and relationships', () => {
    const { project, concepts } = fixture();
    const result = quizFromProject(project, {
      title: 'Mixed practice',
      concepts,
      types: ['multiple-choice', 'true-false', 'short-answer'],
      maxQuestions: 12,
      random: randomSequence([0.1, 0.7, 0.3, 0.9]),
    });
    expect(result.warnings).toEqual([]);
    expect(result.quiz.questions.length).toBeGreaterThanOrEqual(3);
    expect(result.quiz.questions.length).toBeLessThanOrEqual(12);
    expect(result.quiz.source).toBe('rules');
    expect(result.quiz.projectId).toBe(project.projectId);
    expect(new Set(result.quiz.questions.map((question) => question.prompt)).size).toBe(
      result.quiz.questions.length,
    );
    const ids = new Set(concepts.map((concept) => concept.id));
    for (const question of result.quiz.questions) {
      expect(ids.has(question.conceptId ?? '')).toBe(true);
      expect(question.explanation.length).toBeGreaterThan(0);
      if (question.type === 'multiple-choice') {
        expect(question.options).toContain(question.correctAnswer);
      }
      if (question.type === 'true-false') {
        expect(['True', 'False']).toContain(question.correctAnswer);
      }
    }
  });

  it('localizes generated questions and warnings for Indonesian', () => {
    const { project, concepts } = fixture();
    const result = quizFromProject(project, {
      title: 'Latihan campuran',
      concepts,
      types: ['multiple-choice', 'true-false', 'short-answer'],
      maxQuestions: 8,
      random: randomSequence([0.2, 0.8, 0.4, 0.6]),
      language: 'id',
    });

    const prompts = result.quiz.questions.map((question) => question.prompt);
    expect(prompts.some((prompt) => prompt.startsWith('Konsep mana'))).toBe(true);
    expect(prompts.some((prompt) => prompt.startsWith('Jelaskan'))).toBe(true);
    expect(prompts.some((prompt) => prompt.includes('Dalam proyek ini'))).toBe(true);
    for (const question of result.quiz.questions) {
      if (question.type === 'true-false') {
        expect(['Benar', 'Salah']).toContain(question.correctAnswer);
      }
    }
    expect(result.quiz.description).toMatch(/Tidak ada penyedia AI/);

    const sparse = generateQuiz({
      projectId: project.projectId,
      title: 'Kosong',
      concepts: [createConcept(project.projectId, { label: 'Satu' })],
      allConcepts: [createConcept(project.projectId, { label: 'Satu' })],
      relationships: [],
      types: ['true-false'],
      maxQuestions: 3,
      random: randomSequence([0.5]),
      language: 'id',
    });
    expect(sparse.warnings.join(' ')).toMatch(/memerlukan relasi/);
  });

  it('reports warnings when no relationship questions are possible', () => {
    const { project, concepts } = fixture();
    const result = generateQuiz({
      projectId: project.projectId,
      title: 'No relationships',
      concepts,
      allConcepts: concepts,
      relationships: [],
      types: ['true-false'],
      maxQuestions: 5,
      random: randomSequence([0.5]),
    });
    expect(result.quiz.questions).toHaveLength(0);
    expect(result.warnings.join(' ')).toMatch(/need relationships/);
  });

  it('reports warnings for concepts without descriptions', () => {
    const base = createEmptyProject('Sparse');
    const concepts = [
      createConcept(base.projectId, { label: 'One' }),
      createConcept(base.projectId, { label: 'Two' }),
      createConcept(base.projectId, { label: 'Three' }),
    ];
    const result = generateQuiz({
      projectId: base.projectId,
      title: 'Sparse',
      concepts,
      allConcepts: concepts,
      relationships: [],
      types: ['multiple-choice', 'short-answer'],
      maxQuestions: 5,
      random: randomSequence([0.5]),
    });
    expect(result.quiz.questions).toHaveLength(0);
    expect(result.warnings.join(' ')).toMatch(/at least 20 characters/);
    expect(result.warnings.join(' ')).toMatch(/at least three concepts with descriptions/);
  });

  it('respects the requested maximum', () => {
    const { project, concepts } = fixture();
    const result = quizFromProject(project, {
      title: 'Short quiz',
      concepts: concepts.slice(0, 2),
      types: ['multiple-choice', 'short-answer'],
      maxQuestions: 2,
      random: randomSequence([0.2, 0.8]),
    });
    expect(result.quiz.questions).toHaveLength(2);
  });
});
