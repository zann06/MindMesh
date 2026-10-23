import { describe, expect, it } from 'vitest';
import {
  createConcept,
  createDocumentRecord,
  createEmptyProject,
  createQuiz,
  createQuizQuestion,
  createRelationship,
  createSourceReference,
} from '@/core/domain/factory';
import {
  buildProjectExport,
  cloneImportedProject,
  exportFilename,
  prepareProjectImport,
} from '@/core/import-export/project-io';
import { UnsupportedSchemaError } from '@/core/validation/migration';
import { ProjectValidationError } from '@/core/validation/integrity';
import type { KnowledgeProject, QuizAttempt } from '@/core/domain/types';

function fullProject(): KnowledgeProject {
  const base = createEmptyProject('Import me');
  const text = '# Heading\n\nA source passage.';
  const document = createDocumentRecord({
    projectId: base.projectId,
    filename: 'source.md',
    mediaType: 'text/markdown',
    fileSize: text.length,
    contentHash: 'abc123',
    extractedText: text,
    extractionMethod: 'markdown',
    sections: [
      {
        id: 'sec_1',
        heading: 'Heading',
        headingLevel: 1,
        startOffset: 0,
        endOffset: text.length,
        excerpt: 'Heading\nA source passage.',
      },
    ],
  });
  const reference = createSourceReference({
    documentId: document.id,
    sectionHeading: 'Heading',
    startOffset: 0,
    endOffset: text.length,
    excerpt: 'A source passage.',
    extractionMethod: 'markdown-heading',
  });
  const alpha = createConcept(base.projectId, {
    label: 'Alpha',
    description: 'First concept',
    sourceReferences: [reference],
  });
  const beta = createConcept(base.projectId, { label: 'Beta', description: 'Second concept' });
  const relationship = createRelationship(base.projectId, {
    sourceConceptId: alpha.id,
    targetConceptId: beta.id,
    relationType: 'related-to',
    sourceReferences: [reference],
  });
  const question = createQuizQuestion({
    conceptId: alpha.id,
    type: 'multiple-choice',
    prompt: 'Which one is first?',
    options: ['Alpha', 'Beta'],
    correctAnswer: 'Alpha',
    explanation: 'Alpha is first.',
    sourceReferences: [reference],
  });
  const quiz = createQuiz(base.projectId, {
    title: 'Source quiz',
    questions: [question],
    source: 'user',
  });
  const attempt: QuizAttempt = {
    id: 'attempt_1',
    projectId: base.projectId,
    quizId: quiz.id,
    quizTitle: quiz.title,
    startedAt: '2026-01-01T00:00:00.000Z',
    completedAt: '2026-01-01T00:01:00.000Z',
    answers: [
      {
        questionId: question.id,
        conceptId: alpha.id,
        answer: 'Alpha',
        correct: true,
        answeredAt: '2026-01-01T00:00:30.000Z',
      },
    ],
    score: 1,
    total: 1,
  };
  return {
    ...base,
    documents: [document],
    concepts: [alpha, beta],
    relationships: [relationship],
    quizzes: [quiz],
    attempts: [attempt],
    learningRecords: [
      {
        conceptId: alpha.id,
        projectId: base.projectId,
        attempts: 1,
        correctAnswers: 1,
        masteryState: 'learning',
        lastReviewedAt: attempt.completedAt,
      },
    ],
  };
}

describe('project export', () => {
  it('omits extracted text and learning history without mutating the source', () => {
    const project = fullProject();
    const before = structuredClone(project);
    const exported = buildProjectExport(project, {
      includeExtractedText: false,
      includeLearningData: false,
    });
    expect(exported.manifest.includesExtractedText).toBe(false);
    expect(exported.manifest.includesLearningData).toBe(false);
    expect(exported.project.documents[0].extractedText).toBe('');
    expect(exported.project.learningRecords).toEqual([]);
    expect(exported.project.attempts).toEqual([]);
    expect(exported.project.concepts).toEqual(project.concepts);
    expect(project).toEqual(before);
  });

  it('includes learning data when requested', () => {
    const project = fullProject();
    const exported = buildProjectExport(project, {
      includeExtractedText: true,
      includeLearningData: true,
    });
    expect(exported.project.documents[0].extractedText).toContain('source passage');
    expect(exported.project.learningRecords).toHaveLength(1);
    expect(exported.project.attempts).toHaveLength(1);
  });

  it('builds a safe filename', () => {
    const project = { ...createEmptyProject('Café / Test: One'), name: 'Café / Test: One' };
    expect(exportFilename(project)).toMatch(/^cafe-test-one-\d{4}-\d{2}-\d{2}\.mindmesh\.json$/);
  });
});

describe('project import', () => {
  it('remaps every cross-entity id and keeps the original untouched', () => {
    const source = fullProject();
    const exported = buildProjectExport(source, {
      includeExtractedText: true,
      includeLearningData: true,
    });
    const preview = prepareProjectImport(JSON.parse(JSON.stringify(exported)));
    const cloned = preview.project;
    expect(cloned.projectId).not.toBe(source.projectId);
    expect(cloned.name).toBe('Import me (imported)');
    expect(cloned.documents[0].id).not.toBe(source.documents[0].id);
    expect(cloned.concepts[0].id).not.toBe(source.concepts[0].id);
    expect(cloned.relationships[0].id).not.toBe(source.relationships[0].id);
    expect(cloned.quizzes[0].id).not.toBe(source.quizzes[0].id);
    expect(cloned.quizzes[0].questions[0].id).not.toBe(source.quizzes[0].questions[0].id);
    expect(cloned.attempts[0].id).not.toBe(source.attempts[0].id);

    expect(cloned.documents[0].projectId).toBe(cloned.projectId);
    expect(cloned.concepts[0].sourceReferences[0].documentId).toBe(cloned.documents[0].id);
    expect(cloned.relationships[0].sourceConceptId).toBe(cloned.concepts[0].id);
    expect(cloned.relationships[0].sourceReferences[0].documentId).toBe(cloned.documents[0].id);
    expect(cloned.quizzes[0].questions[0].conceptId).toBe(cloned.concepts[0].id);
    expect(cloned.learningRecords[0].conceptId).toBe(cloned.concepts[0].id);
    expect(cloned.attempts[0].quizId).toBe(cloned.quizzes[0].id);
    expect(cloned.attempts[0].answers[0].questionId).toBe(cloned.quizzes[0].questions[0].id);
    expect(cloned.attempts[0].answers[0].conceptId).toBe(cloned.concepts[0].id);
    expect(source.projectId).toBe(exported.project.projectId);
    expect(source.concepts[0].sourceReferences[0].documentId).toBe(source.documents[0].id);
  });

  it('warns when an export omitted text or history', () => {
    const exported = buildProjectExport(fullProject(), {
      includeExtractedText: false,
      includeLearningData: false,
    });
    const preview = prepareProjectImport(exported);
    expect(preview.warnings.join(' ')).toMatch(/omitted full extracted text/);
    expect(preview.warnings.join(' ')).toMatch(/did not include learning history/);
  });

  it('accepts a bare project and synthesizes a manifest', () => {
    const source = fullProject();
    const preview = prepareProjectImport(JSON.parse(JSON.stringify(source)));
    expect(preview.project.name).toBe('Import me (imported)');
    expect(preview.warnings).toEqual([]);
  });

  it('refuses a project with a missing document reference', () => {
    const source = fullProject();
    source.concepts[0].sourceReferences[0].documentId = 'doc_missing';
    try {
      cloneImportedProject(source);
      expect.unreachable('The import should have failed.');
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectValidationError);
      expect((error as ProjectValidationError).issues).toContainEqual(
        expect.objectContaining({ code: 'missing-document' }),
      );
    }
  });

  it('refuses a newer schema without attempting a downgrade', () => {
    const exported = buildProjectExport(fullProject(), {
      includeExtractedText: true,
      includeLearningData: true,
    });
    exported.project.schemaVersion = 99;
    exported.manifest.schemaVersion = 99;
    expect(() => prepareProjectImport(exported)).toThrow(UnsupportedSchemaError);
  });
});
