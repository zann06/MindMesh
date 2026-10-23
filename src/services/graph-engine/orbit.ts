import { relationLabel } from '@/app/relation-copy';
import type { KnowledgeProject, MasteryState, RelationType } from '@/core/domain/types';
import { buildWorldLayout, getDirectRelationships } from './graph';

export interface OrbitNode {
  id: string;
  label: string;
  color: string;
  meta?: string;
}

const FALLBACK_COLOR = '#7ebaa3';

const MASTERY_COLORS: Record<MasteryState, string> = {
  new: '#717780',
  learning: '#cbad74',
  familiar: '#8aa2b8',
  mastered: '#7cbfa6',
};

const MASTERY_PRIORITY: Record<MasteryState, number> = {
  learning: 0,
  familiar: 1,
  new: 2,
  mastered: 3,
};

function colorMap(project: KnowledgeProject): Map<string, string> {
  return new Map(
    buildWorldLayout(project.concepts).nodes.map((node) => [node.conceptId, node.color]),
  );
}

export function buildConceptOrbit(
  project: KnowledgeProject,
  conceptId: string,
  limit = 7,
): OrbitNode[] {
  const concept = project.concepts.find((candidate) => candidate.id === conceptId);
  if (!concept) return [];

  const byId = new Map(project.concepts.map((candidate) => [candidate.id, candidate]));
  const colors = colorMap(project);
  const neighbors = new Map<string, RelationType[]>();

  for (const relationship of getDirectRelationships(project, conceptId)) {
    const neighborId =
      relationship.sourceConceptId === conceptId
        ? relationship.targetConceptId
        : relationship.sourceConceptId;
    if (!byId.has(neighborId)) continue;
    const types = neighbors.get(neighborId) ?? [];
    if (!types.includes(relationship.relationType)) types.push(relationship.relationType);
    neighbors.set(neighborId, types);
  }

  return [...neighbors.entries()]
    .sort((a, b) => {
      const byDegree = b[1].length - a[1].length;
      if (byDegree !== 0) return byDegree;
      return (byId.get(a[0])?.label ?? '').localeCompare(byId.get(b[0])?.label ?? '');
    })
    .slice(0, limit)
    .map(([id, types]) => {
      const neighbor = byId.get(id);
      const primary = relationLabel(types[0]);
      return {
        id,
        label: neighbor?.label ?? 'Untitled concept',
        color: colors.get(id) ?? FALLBACK_COLOR,
        meta: types.length > 1 ? `${primary} +${types.length - 1}` : primary,
      };
    });
}

export function buildMasteryOrbit(project: KnowledgeProject, limit = 7): OrbitNode[] {
  if (project.concepts.length === 0) return [];

  const records = new Map(
    project.learningRecords.map((record) => [record.conceptId, record]),
  );
  const now = Date.now();

  return project.concepts
    .map((concept) => {
      const record = records.get(concept.id);
      const mastery = record?.masteryState ?? 'new';
      const due = Boolean(
        record?.nextReviewAt && new Date(record.nextReviewAt).getTime() <= now,
      );
      return { concept, record, mastery, due };
    })
    .sort((a, b) => {
      if (a.due !== b.due) return a.due ? -1 : 1;
      const priorityDiff = MASTERY_PRIORITY[a.mastery] - MASTERY_PRIORITY[b.mastery];
      if (priorityDiff !== 0) return priorityDiff;
      return a.concept.label.localeCompare(b.concept.label);
    })
    .slice(0, limit)
    .map(({ concept, record, mastery, due }) => {
      const label =
        mastery === 'new'
          ? 'Not practised'
          : mastery.charAt(0).toUpperCase() + mastery.slice(1);
      return {
        id: concept.id,
        label: concept.label,
        color: due ? FALLBACK_COLOR : MASTERY_COLORS[mastery],
        meta: due
          ? `${label} · review due`
          : record?.attempts
            ? `${label} · ${record.correctAnswers}/${record.attempts} correct`
            : label,
      };
    });
}

export function buildWorkspaceOrbit(project: KnowledgeProject, limit = 7): OrbitNode[] {
  if (project.concepts.length === 0) return [];

  const colors = colorMap(project);
  const degree = new Map(project.concepts.map((concept) => [concept.id, 0]));
  for (const relationship of project.relationships) {
    degree.set(
      relationship.sourceConceptId,
      (degree.get(relationship.sourceConceptId) ?? 0) + 1,
    );
    degree.set(
      relationship.targetConceptId,
      (degree.get(relationship.targetConceptId) ?? 0) + 1,
    );
  }

  return [...project.concepts]
    .sort(
      (a, b) =>
        (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.label.localeCompare(b.label),
    )
    .slice(0, limit)
    .map((concept) => {
      const links = degree.get(concept.id) ?? 0;
      return {
        id: concept.id,
        label: concept.label,
        color: colors.get(concept.id) ?? FALLBACK_COLOR,
        meta: `${links} link${links === 1 ? '' : 's'}`,
      };
    });
}
