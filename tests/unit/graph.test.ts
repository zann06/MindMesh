import { describe, expect, it } from 'vitest';
import { createConcept, createEmptyProject, createQuiz, createQuizQuestion, createRelationship, createLearningRecord } from '@/core/domain/factory';
import {
  GraphError,
  addConcept,
  addRelationship,
  buildSearchIndex,
  buildWorldLayout,
  computeGraphStats,
  deleteConcept,
  filterGraph,
  findConceptByLabel,
  normalizeLabel,
  shortestPath,
  updateConcept,
} from '@/services/graph-engine/graph';
import { buildConceptOrbit, buildMasteryOrbit, buildWorkspaceOrbit } from '@/services/graph-engine/orbit';

function fixture() {
  const base = createEmptyProject('Graph test');
  const alpha = createConcept(base.projectId, {
    label: 'Alpha',
    description: 'The first concept',
    aliases: ['A'],
    tags: ['Basics', 'First'],
  });
  const beta = createConcept(base.projectId, {
    label: 'Beta',
    description: 'The second concept',
    tags: ['Basics'],
  });
  const gamma = createConcept(base.projectId, {
    label: 'Gamma',
    description: 'The third concept',
    tags: ['Advanced'],
  });
  let project = addConcept(addConcept(addConcept(base, alpha), beta), gamma);
  const relation = createRelationship(project.projectId, {
    sourceConceptId: alpha.id,
    targetConceptId: beta.id,
    relationType: 'prerequisite',
    explanation: 'Alpha comes first',
  });
  const second = createRelationship(project.projectId, {
    sourceConceptId: gamma.id,
    targetConceptId: beta.id,
    relationType: 'related-to',
  });
  project = addRelationship(addRelationship(project, relation), second);
  return { project, alpha, beta, gamma, relation };
}

describe('graph labels', () => {
  it('normalizes case, punctuation, whitespace, and diacritics', () => {
    expect(normalizeLabel('  Café—Déjà Vu! ')).toBe('cafe deja vu');
    expect(normalizeLabel('A  B\nC')).toBe('a b c');
    expect(normalizeLabel('!!!')).toBe('');
  });

  it('finds a concept by alias', () => {
    const { project, alpha } = fixture();
    expect(findConceptByLabel(project.concepts, '  a ')?.id).toBe(alpha.id);
  });
});

describe('graph mutations', () => {
  it('rejects duplicate labels and aliases', () => {
    const { project } = fixture();
    const duplicate = createConcept(project.projectId, { label: 'ALPHA' });
    expect(() => addConcept(project, duplicate)).toThrow(GraphError);
    try {
      addConcept(project, duplicate);
    } catch (error) {
      expect((error as GraphError).code).toBe('duplicate-concept');
    }
  });

  it('rejects empty and overlong labels', () => {
    const { project } = fixture();
    expect(() => addConcept(project, createConcept(project.projectId, { label: '   ' }))).toThrow(
      /non-empty label/,
    );
    expect(() =>
      addConcept(project, createConcept(project.projectId, { label: 'x'.repeat(301) })),
    ).toThrow(/300 characters/);
  });

  it('updates a concept without allowing a duplicate label', () => {
    const { project, alpha, beta } = fixture();
    expect(() => updateConcept(project, alpha.id, { label: beta.label })).toThrow(/already uses/);
    const updated = updateConcept(project, alpha.id, {
      label: 'Alpha prime',
      tags: ['Renamed'],
    });
    expect(updated.concepts.find((concept) => concept.id === alpha.id)?.label).toBe('Alpha prime');
    expect(updated.concepts.find((concept) => concept.id === alpha.id)?.tags).toEqual(['Renamed']);
  });

  it('deletes dependent relationships, learning records, and question links', () => {
    const { project, alpha, beta } = fixture();
    const question = createQuizQuestion({
      conceptId: alpha.id,
      type: 'short-answer',
      prompt: 'Explain Alpha',
      correctAnswer: 'The first concept',
    });
    const quiz = createQuiz(project.projectId, {
      title: 'Test',
      source: 'user',
      questions: [question],
    });
    const withData = {
      ...project,
      quizzes: [quiz],
      learningRecords: [createLearningRecord(project.projectId, alpha.id)],
    };
    const next = deleteConcept(withData, alpha.id);
    expect(next.concepts.some((concept) => concept.id === alpha.id)).toBe(false);
    expect(next.relationships.some((relationship) => relationship.sourceConceptId === alpha.id)).toBe(false);
    expect(next.relationships.some((relationship) => relationship.targetConceptId === alpha.id)).toBe(false);
    expect(next.learningRecords).toHaveLength(0);
    expect(next.quizzes[0].questions[0].conceptId).toBeUndefined();
    expect(next.concepts.some((concept) => concept.id === beta.id)).toBe(true);
  });
});

describe('relationships and traversal', () => {
  it('rejects self links, missing concepts, and duplicates', () => {
    const { project, alpha, beta } = fixture();
    const self = createRelationship(project.projectId, {
      sourceConceptId: alpha.id,
      targetConceptId: alpha.id,
      relationType: 'related-to',
    });
    expect(() => addRelationship(project, self)).toThrow(/itself/);

    const missing = createRelationship(project.projectId, {
      sourceConceptId: alpha.id,
      targetConceptId: 'con_missing',
      relationType: 'related-to',
    });
    expect(() => addRelationship(project, missing)).toThrow(/Both concepts/);

    const duplicate = createRelationship(project.projectId, {
      sourceConceptId: alpha.id,
      targetConceptId: beta.id,
      relationType: 'prerequisite',
    });
    expect(() => addRelationship(project, duplicate)).toThrow(/already exists/);
  });

  it('finds an undirected shortest path', () => {
    const { project, alpha, beta, gamma } = fixture();
    expect(shortestPath(project, alpha.id, beta.id)).toEqual([alpha.id, beta.id]);
    expect(shortestPath(project, alpha.id, gamma.id)).toEqual([alpha.id, beta.id, gamma.id]);
    expect(shortestPath(project, alpha.id, alpha.id)).toEqual([alpha.id]);
    expect(shortestPath(project, alpha.id, 'con_missing')).toBeNull();
  });
});

describe('graph views', () => {
  it('computes deterministic statistics', () => {
    const { project } = fixture();
    const stats = computeGraphStats(project);
    expect(stats.conceptCount).toBe(3);
    expect(stats.relationshipCount).toBe(2);
    expect(stats.isolatedConcepts).toBe(0);
    expect(stats.averageDegree).toBeCloseTo(4 / 3);
    expect(stats.relationTypeCounts.prerequisite).toBe(1);
    expect(stats.relationTypeCounts['related-to']).toBe(1);
    expect(stats.tagCounts.Basics).toBe(2);
  });

  it('filters by tag, text, status, and relation type', () => {
    const { project, alpha } = fixture();
    expect(filterGraph(project, { tag: 'Advanced' }).concepts).toHaveLength(1);
    expect(filterGraph(project, { query: 'second' }).concepts).toHaveLength(1);
    expect(filterGraph(project, { query: 'a' }).concepts.map((concept) => concept.id)).toContain(
      alpha.id,
    );
    expect(filterGraph(project, { relationType: 'prerequisite' }).relationships).toHaveLength(1);
    expect(filterGraph(project, { reviewStatus: 'suggested' }).concepts).toHaveLength(0);
  });

  it('creates stable region layouts', () => {
    const { project } = fixture();
    const first = buildWorldLayout(project.concepts);
    const second = buildWorldLayout(project.concepts);
    expect(first).toEqual(second);
    expect(first.regions.map((region) => region.name)).toEqual(['Advanced', 'Basics']);
    expect(first.nodes).toHaveLength(3);
    expect(first.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.z))).toBe(true);
    const sphere = buildWorldLayout(project.concepts, 'sphere');
    expect(sphere.regions).toHaveLength(1);
    expect(sphere.nodes.every((node) => node.region === 'All concepts')).toBe(true);
  });

  it('indexes concepts and documents for search', () => {
    const { project } = fixture();
    const index = buildSearchIndex(project);
    expect(index.filter((entry) => entry.kind === 'concept')).toHaveLength(3);
    expect(index.find((entry) => entry.title === 'Alpha')?.href).toMatch('/concepts/');
  });

  it('builds focused orbit data without duplicates', () => {
    const { project, alpha, beta } = fixture();
    const orbit = buildConceptOrbit(project, alpha.id);
    expect(orbit).toHaveLength(1);
    expect(orbit[0]?.id).toBe(beta.id);
    expect(orbit[0]?.meta).toBe('Prerequisite');
    expect(buildConceptOrbit(project, 'con_missing')).toEqual([]);
  });

  it('orders workspace orbit nodes by connection count', () => {
    const { project, beta } = fixture();
    const orbit = buildWorkspaceOrbit(project);
    expect(orbit).toHaveLength(3);
    expect(orbit[0]?.id).toBe(beta.id);
    expect(orbit[0]?.meta).toBe('2 links');
    expect(buildWorkspaceOrbit({ ...project, concepts: [] })).toEqual([]);
  });

  it('puts due review concepts first in the mastery orbit', () => {
    const { project, alpha, gamma } = fixture();
    const record = createLearningRecord(project.projectId, gamma.id);
    const orbit = buildMasteryOrbit({
      ...project,
      learningRecords: [
        {
          ...record,
          masteryState: 'learning',
          attempts: 2,
          correctAnswers: 1,
          lastReviewedAt: new Date(Date.now() - 86_400_000).toISOString(),
          nextReviewAt: new Date(Date.now() - 60_000).toISOString(),
        },
      ],
    });
    expect(orbit).toHaveLength(3);
    expect(orbit[0]?.id).toBe(gamma.id);
    expect(orbit[0]?.meta).toContain('review due');
    expect(orbit[1]?.id).toBe(alpha.id);
    expect(buildMasteryOrbit({ ...project, concepts: [] })).toEqual([]);
  });
});
