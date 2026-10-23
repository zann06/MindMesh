import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorkspaceStore } from '@/app/workspace-store';
import { createMemoryRepository } from '@/core/storage/memory';
import { buildProjectExport } from '@/core/import-export/project-io';
import { validateProjectIntegrity } from '@/core/validation/integrity';
import type { QuizAttempt } from '@/core/domain/types';

const SAMPLE_MARKDOWN = [
  '# Evidence-first knowledge',
  '',
  'Every concept should retain an inspectable source reference and a page or section.',
  '',
  '# The knowledge graph',
  '',
  'Concepts form nodes and typed relationships form edges in a navigable graph.',
  '',
  '# Local-first storage',
  '',
  'Projects and learning records live in IndexedDB with versioned exports.',
  '',
  '# Bring your own AI',
  '',
  'AI is optional and requires explicit consent before sending document content.',
  '',
  '# The learning loop',
  '',
  'Quizzes and review dates are stored locally, and mastery requires repeated evidence.',
  '',
  '# What MindMesh does not do',
  '',
  'Scanned PDFs without selectable text are not OCRed or cited.',
].join('\n');

function attemptFor(
  projectId: string,
  quizId: string,
  conceptId: string,
  correct: boolean,
  index: number,
): QuizAttempt {
  return {
    id: `attempt_${index}`,
    projectId,
    quizId,
    quizTitle: 'Attempt',
    startedAt: `2026-01-0${index}T00:00:00.000Z`,
    completedAt: `2026-01-0${index}T00:01:00.000Z`,
    answers: [
      {
        questionId: 'q1',
        conceptId,
        answer: 'Answer',
        correct,
        answeredAt: `2026-01-0${index}T00:00:30.000Z`,
      },
    ],
    score: correct ? 1 : 0,
    total: 1,
  };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('workspace store', () => {
  it('initializes once under concurrent calls and creates a default project', async () => {
    const repository = createMemoryRepository();
    const store = createWorkspaceStore(repository);
    await Promise.all([store.getState().init(), store.getState().init(), store.getState().init()]);
    const state = store.getState();
    expect(state.initialized).toBe(true);
    expect(state.error).toBeNull();
    expect(state.projects).toHaveLength(1);
    expect(state.activeProject?.name).toBe('My Knowledge');
    expect(await repository.listProjects()).toHaveLength(1);
  });

  it('creates, renames, switches, and deletes projects', async () => {
    const repository = createMemoryRepository();
    const store = createWorkspaceStore(repository);
    await store.getState().init();
    const first = store.getState().activeProject!;
    const second = await store.getState().createProject('Second');
    expect(store.getState().activeProject?.projectId).toBe(second.projectId);

    await store.getState().renameProject('  Renamed  ');
    expect(store.getState().activeProject?.name).toBe('Renamed');

    await store.getState().switchProject(first.projectId);
    expect(store.getState().activeProject?.projectId).toBe(first.projectId);

    await store.getState().deleteProject(first.projectId);
    expect(store.getState().activeProject?.projectId).toBe(second.projectId);
    expect(store.getState().projects).toHaveLength(1);
  });

  it('rejects an empty project rename', async () => {
    const store = createWorkspaceStore(createMemoryRepository());
    await store.getState().init();
    await expect(store.getState().renameProject('   ')).rejects.toThrow(/cannot be empty/);
  });

  it('adds graph data and mutates learning records immutably', async () => {
    const store = createWorkspaceStore(createMemoryRepository());
    await store.getState().init();
    const project = store.getState().activeProject!;
    const alpha = await store.getState().addConcept({
      label: 'Alpha',
      description: 'First concept',
      tags: ['One'],
    });
    const beta = await store.getState().addConcept({
      label: 'Beta',
      description: 'Second concept',
    });
    await store.getState().addRelationship({
      sourceConceptId: alpha.id,
      targetConceptId: beta.id,
      relationType: 'prerequisite',
    });
    const quizId = 'quiz_1';
    await store.getState().recordAttempt(attemptFor(project.projectId, quizId, alpha.id, true, 1));
    const firstRecord = store.getState().activeProject!.learningRecords[0];
    expect(firstRecord).toMatchObject({
      conceptId: alpha.id,
      attempts: 1,
      correctAnswers: 1,
      masteryState: 'learning',
    });

    await store.getState().recordAttempt(attemptFor(project.projectId, quizId, alpha.id, false, 2));
    const secondRecord = store.getState().activeProject!.learningRecords[0];
    expect(secondRecord).toMatchObject({ attempts: 2, correctAnswers: 1 });
    expect(firstRecord.attempts).toBe(1);
    expect(firstRecord.correctAnswers).toBe(1);
    expect(store.getState().activeProject!.relationships).toHaveLength(1);
  });

  it('promotes mastery only after repeated evidence', async () => {
    const store = createWorkspaceStore(createMemoryRepository());
    await store.getState().init();
    const project = store.getState().activeProject!;
    const concept = await store.getState().addConcept({ label: 'Masterable' });
    for (let index = 1; index <= 5; index += 1) {
      await store.getState().recordAttempt(attemptFor(project.projectId, 'quiz', concept.id, true, index));
    }
    expect(store.getState().activeProject!.learningRecords[0].masteryState).toBe('mastered');
    expect(store.getState().activeProject!.learningRecords[0].nextReviewAt).toBeTruthy();
  });

  it('does not mutate an existing record when updating the project', async () => {
    const store = createWorkspaceStore(createMemoryRepository());
    await store.getState().init();
    const project = store.getState().activeProject!;
    const concept = await store.getState().addConcept({ label: 'Stable' });
    await store.getState().recordAttempt(attemptFor(project.projectId, 'quiz', concept.id, true, 1));
    const snapshot = structuredClone(store.getState().activeProject!);
    await store.getState().updateConcept(concept.id, { description: 'Changed' });
    expect(store.getState().activeProject!.concepts[0].description).toBe('Changed');
    expect(snapshot.concepts[0].description).toBe('');
  });

  it('marks provenance as rejected when a concept is rejected', async () => {
    const store = createWorkspaceStore(createMemoryRepository());
    await store.getState().init();
    const concept = await store.getState().addConcept({ label: 'Review me' });
    await store.getState().updateConcept(concept.id, { reviewStatus: 'rejected' });
    const updated = store.getState().activeProject!.concepts[0];
    expect(updated.reviewStatus).toBe('rejected');
    expect(updated.provenance.status).toBe('rejected');
  });

  it('imports an export as a new project with repaired references', async () => {
    const sourceStore = createWorkspaceStore(createMemoryRepository());
    await sourceStore.getState().init();
    const concept = await sourceStore.getState().addConcept({ label: 'Imported concept' });
    const exported = buildProjectExport(sourceStore.getState().activeProject!, {
      includeExtractedText: true,
      includeLearningData: true,
    });

    const targetRepository = createMemoryRepository();
    const targetStore = createWorkspaceStore(targetRepository);
    await targetStore.getState().init();
    const imported = await targetStore.getState().importProject(exported);
    expect(imported.projectId).not.toBe(sourceStore.getState().activeProject?.projectId);
    expect(imported.name).toContain('(imported)');
    expect(imported.concepts[0].label).toBe(concept.label);
    expect(targetStore.getState().projects).toHaveLength(2);
    expect(validateProjectIntegrity(imported).filter((issue) => issue.severity === 'error')).toEqual([]);
  });

  it('loads the bundled sample through fetch and validates provenance', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(SAMPLE_MARKDOWN, { status: 200 })),
    );
    const store = createWorkspaceStore(createMemoryRepository());
    await store.getState().init();
    const sample = await store.getState().loadSampleProject();
    expect(sample.name).toBe('MindMesh sample');
    expect(sample.documents).toHaveLength(1);
    expect(sample.concepts).toHaveLength(6);
    expect(sample.relationships).toHaveLength(4);
    expect(sample.quizzes).toHaveLength(1);
    expect(validateProjectIntegrity(sample).filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(sample.concepts.every((concept) => concept.sourceReferences.length === 1)).toBe(true);
    expect(store.getState().activeProject?.projectId).toBe(sample.projectId);
  });
});
