import { nowIso } from '@/lib/utils';
import { RELATION_TYPES } from '@/core/domain/types';
import type {
  Concept,
  ConceptInput,
  GraphNodePosition,
  GraphStats,
  KnowledgeProject,
  RelationType,
  Relationship,
  RelationshipInput,
} from '@/core/domain/types';

export class GraphError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GraphError';
    this.code = code;
  }
}

const REGION_COLORS = [
  '#7ebaa3',
  '#8aa2b8',
  '#c08f76',
  '#c9b283',
  '#9fb07a',
  '#6fa6a0',
  '#b3a6b8',
  '#b7a06e',
];

export function normalizeLabel(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function hashParts(value: string): [number, number, number, number] {
  const first = fnv1a(value);
  const second = fnv1a(`${value}::mesh`);
  const third = fnv1a(`${value}::region`);
  return [
    first / 0xffffffff,
    second / 0xffffffff,
    third / 0xffffffff,
    (first ^ second ^ third) >>> 0,
  ];
}

export function relationTypes(): readonly RelationType[] {
  return RELATION_TYPES;
}

export function findConceptByLabel(
  concepts: Concept[],
  label: string,
  excludeId?: string,
): Concept | undefined {
  const normalized = normalizeLabel(label);
  return concepts.find(
    (concept) =>
      concept.id !== excludeId &&
      (normalizeLabel(concept.label) === normalized ||
        concept.aliases.some((alias) => normalizeLabel(alias) === normalized)),
  );
}

export function findDuplicateCandidates(
  project: KnowledgeProject,
  label: string,
  excludeId?: string,
): Concept[] {
  const normalized = normalizeLabel(label);
  if (!normalized) return [];
  return project.concepts.filter(
    (concept) =>
      concept.id !== excludeId &&
      (normalizeLabel(concept.label) === normalized ||
        concept.aliases.some((alias) => normalizeLabel(alias) === normalized) ||
        normalizeLabel(concept.label).includes(normalized) ||
        normalized.includes(normalizeLabel(concept.label))),
  );
}

function assertValidConceptInput(input: ConceptInput): void {
  if (!input.label.trim()) {
    throw new GraphError('invalid-label', 'A concept needs a non-empty label.');
  }
  if (input.label.length > 300) {
    throw new GraphError('invalid-label', 'Concept labels must be 300 characters or fewer.');
  }
}

export function addConcept(project: KnowledgeProject, concept: Concept): KnowledgeProject {
  assertValidConceptInput({ label: concept.label });
  if (project.concepts.some((candidate) => candidate.id === concept.id)) {
    throw new GraphError('duplicate-id', 'A concept with this id already exists.');
  }
  const duplicate = findConceptByLabel(project.concepts, concept.label);
  if (duplicate) {
    throw new GraphError(
      'duplicate-concept',
      `"${duplicate.label}" already exists. Edit it or add a distinct alias.`,
    );
  }
  return {
    ...project,
    concepts: [...project.concepts, { ...concept, projectId: project.projectId }],
    updatedAt: nowIso(),
  };
}

export function updateConcept(
  project: KnowledgeProject,
  conceptId: string,
  patch: Partial<Omit<Concept, 'id' | 'projectId' | 'createdAt'>>,
): KnowledgeProject {
  const existing = project.concepts.find((concept) => concept.id === conceptId);
  if (!existing) throw new GraphError('missing-concept', 'Concept not found.');
  if (patch.label !== undefined) {
    assertValidConceptInput({ label: patch.label });
    const duplicate = findConceptByLabel(project.concepts, patch.label, conceptId);
    if (duplicate) {
      throw new GraphError(
        'duplicate-concept',
        `"${duplicate.label}" already uses this label or alias.`,
      );
    }
  }
  return {
    ...project,
    concepts: project.concepts.map((concept) =>
      concept.id === conceptId
        ? { ...concept, ...patch, label: patch.label ?? concept.label, updatedAt: nowIso() }
        : concept,
    ),
    updatedAt: nowIso(),
  };
}

export function deleteConcept(project: KnowledgeProject, conceptId: string): KnowledgeProject {
  if (!project.concepts.some((concept) => concept.id === conceptId)) {
    throw new GraphError('missing-concept', 'Concept not found.');
  }
  return {
    ...project,
    concepts: project.concepts.filter((concept) => concept.id !== conceptId),
    relationships: project.relationships.filter(
      (relationship) =>
        relationship.sourceConceptId !== conceptId && relationship.targetConceptId !== conceptId,
    ),
    learningRecords: project.learningRecords.filter((record) => record.conceptId !== conceptId),
    quizzes: project.quizzes.map((quiz) => ({
      ...quiz,
      questions: quiz.questions.map((question) =>
        question.conceptId === conceptId ? { ...question, conceptId: undefined } : question,
      ),
    })),
    updatedAt: nowIso(),
  };
}

export function addRelationship(
  project: KnowledgeProject,
  relationship: Relationship,
): KnowledgeProject {
  validateRelationshipInput(project, {
    sourceConceptId: relationship.sourceConceptId,
    targetConceptId: relationship.targetConceptId,
    relationType: relationship.relationType,
    explanation: relationship.explanation,
    sourceReferences: relationship.sourceReferences,
  });
  if (project.relationships.some((candidate) => candidate.id === relationship.id)) {
    throw new GraphError('duplicate-id', 'A relationship with this id already exists.');
  }
  const existing = project.relationships.find(
    (candidate) =>
      candidate.relationType === relationship.relationType &&
      candidate.sourceConceptId === relationship.sourceConceptId &&
      candidate.targetConceptId === relationship.targetConceptId,
  );
  if (existing) {
    throw new GraphError('duplicate-relationship', 'This relationship already exists.');
  }
  return {
    ...project,
    relationships: [...project.relationships, { ...relationship, projectId: project.projectId }],
    updatedAt: nowIso(),
  };
}

export function updateRelationship(
  project: KnowledgeProject,
  relationshipId: string,
  patch: Partial<Omit<Relationship, 'id' | 'projectId' | 'createdAt'>>,
): KnowledgeProject {
  const existing = project.relationships.find((relationship) => relationship.id === relationshipId);
  if (!existing) throw new GraphError('missing-relationship', 'Relationship not found.');
  const next = { ...existing, ...patch };
  validateRelationshipInput(project, next);
  return {
    ...project,
    relationships: project.relationships.map((relationship) =>
      relationship.id === relationshipId
        ? { ...relationship, ...patch, updatedAt: nowIso() }
        : relationship,
    ),
    updatedAt: nowIso(),
  };
}

export function deleteRelationship(
  project: KnowledgeProject,
  relationshipId: string,
): KnowledgeProject {
  if (!project.relationships.some((relationship) => relationship.id === relationshipId)) {
    throw new GraphError('missing-relationship', 'Relationship not found.');
  }
  return {
    ...project,
    relationships: project.relationships.filter(
      (relationship) => relationship.id !== relationshipId,
    ),
    updatedAt: nowIso(),
  };
}

function validateRelationshipInput(project: KnowledgeProject, input: RelationshipInput): void {
  if (input.sourceConceptId === input.targetConceptId) {
    throw new GraphError('self-link', 'A concept cannot relate to itself.');
  }
  const source = project.concepts.find((concept) => concept.id === input.sourceConceptId);
  const target = project.concepts.find((concept) => concept.id === input.targetConceptId);
  if (!source || !target) {
    throw new GraphError('missing-concept', 'Both concepts must exist before linking them.');
  }
  if (!RELATION_TYPES.includes(input.relationType)) {
    throw new GraphError('invalid-relation', 'Unknown relationship type.');
  }
}

export function getNeighbors(project: KnowledgeProject, conceptId: string): Concept[] {
  const ids = new Set<string>();
  for (const relationship of project.relationships) {
    if (relationship.sourceConceptId === conceptId) ids.add(relationship.targetConceptId);
    if (relationship.targetConceptId === conceptId) ids.add(relationship.sourceConceptId);
  }
  return project.concepts.filter((concept) => ids.has(concept.id));
}

export function getDirectRelationships(
  project: KnowledgeProject,
  conceptId: string,
): Relationship[] {
  return project.relationships.filter(
    (relationship) =>
      relationship.sourceConceptId === conceptId || relationship.targetConceptId === conceptId,
  );
}

export function shortestPath(
  project: KnowledgeProject,
  fromConceptId: string,
  toConceptId: string,
): string[] | null {
  if (fromConceptId === toConceptId) {
    return project.concepts.some((concept) => concept.id === fromConceptId)
      ? [fromConceptId]
      : null;
  }
  const adjacency = new Map<string, string[]>();
  for (const relationship of project.relationships) {
    if (!adjacency.has(relationship.sourceConceptId)) adjacency.set(relationship.sourceConceptId, []);
    if (!adjacency.has(relationship.targetConceptId)) adjacency.set(relationship.targetConceptId, []);
    adjacency.get(relationship.sourceConceptId)?.push(relationship.targetConceptId);
    adjacency.get(relationship.targetConceptId)?.push(relationship.sourceConceptId);
  }
  const queue: string[][] = [[fromConceptId]];
  const visited = new Set<string>([fromConceptId]);
  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) break;
    const last = path[path.length - 1];
    for (const neighbor of adjacency.get(last) ?? []) {
      if (neighbor === toConceptId) return [...path, neighbor];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

export function computeGraphStats(project: KnowledgeProject): GraphStats {
  const relationTypeCounts = Object.fromEntries(
    RELATION_TYPES.map((type) => [type, 0]),
  ) as Record<RelationType, number>;
  const degree = new Map<string, number>();
  for (const concept of project.concepts) degree.set(concept.id, 0);
  for (const relationship of project.relationships) {
    relationTypeCounts[relationship.relationType] += 1;
    degree.set(relationship.sourceConceptId, (degree.get(relationship.sourceConceptId) ?? 0) + 1);
    degree.set(relationship.targetConceptId, (degree.get(relationship.targetConceptId) ?? 0) + 1);
  }
  const tagCounts: Record<string, number> = {};
  for (const concept of project.concepts) {
    for (const tag of concept.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  const isolatedConcepts = [...degree.values()].filter((value) => value === 0).length;
  const totalDegree = [...degree.values()].reduce((sum, value) => sum + value, 0);
  return {
    conceptCount: project.concepts.length,
    relationshipCount: project.relationships.length,
    documentCount: project.documents.length,
    isolatedConcepts,
    averageDegree: project.concepts.length ? totalDegree / project.concepts.length : 0,
    relationTypeCounts,
    tagCounts,
  };
}

export interface GraphFilters {
  query?: string;
  documentId?: string;
  tag?: string;
  relationType?: RelationType | 'all';
  reviewStatus?: Concept['reviewStatus'] | 'all';
}

export function filterGraph(project: KnowledgeProject, filters: GraphFilters): {
  concepts: Concept[];
  relationships: Relationship[];
} {
  const query = filters.query?.trim().toLowerCase() ?? '';
  const concepts = project.concepts.filter((concept) => {
    if (filters.documentId && filters.documentId !== 'all') {
      if (!concept.sourceReferences.some((ref) => ref.documentId === filters.documentId)) {
        return false;
      }
    }
    if (filters.tag && filters.tag !== 'all' && !concept.tags.includes(filters.tag)) return false;
    if (
      filters.reviewStatus &&
      filters.reviewStatus !== 'all' &&
      concept.reviewStatus !== filters.reviewStatus
    ) {
      return false;
    }
    if (!query) return true;
    const haystack = [concept.label, concept.description, ...concept.aliases, ...concept.tags]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
  const ids = new Set(concepts.map((concept) => concept.id));
  const relationships = project.relationships.filter((relationship) => {
    if (!ids.has(relationship.sourceConceptId) || !ids.has(relationship.targetConceptId)) {
      return false;
    }
    if (
      filters.relationType &&
      filters.relationType !== 'all' &&
      relationship.relationType !== filters.relationType
    ) {
      return false;
    }
    return true;
  });
  return { concepts, relationships };
}

export interface RegionInfo {
  name: string;
  index: number;
  color: string;
  count: number;
  center: { x: number; y: number; z: number };
}

export interface WorldLayout {
  nodes: GraphNodePosition[];
  regions: RegionInfo[];
}

export function conceptRegion(concept: Concept): string {
  return concept.tags[0]?.trim() || 'General';
}

export function buildWorldLayout(
  concepts: Concept[],
  preset: 'regions' | 'sphere' = 'regions',
): WorldLayout {
  const regionsByName = new Map<string, Concept[]>();
  for (const concept of concepts) {
    const region = preset === 'sphere' ? 'All concepts' : conceptRegion(concept);
    const list = regionsByName.get(region) ?? [];
    list.push(concept);
    regionsByName.set(region, list);
  }
  const regionNames = [...regionsByName.keys()].sort((a, b) => a.localeCompare(b));
  const regions: RegionInfo[] = regionNames.map((name, index) => {
    const angle = (index / Math.max(1, regionNames.length)) * Math.PI * 2;
    const radius = regionNames.length === 1 ? 0 : 15;
    return {
      name,
      index,
      color: REGION_COLORS[index % REGION_COLORS.length],
      count: regionsByName.get(name)?.length ?? 0,
      center: {
        x: Math.cos(angle) * radius,
        y: regionNames.length === 1 ? 0 : Math.sin(angle * 2) * 2.5,
        z: Math.sin(angle) * radius,
      },
    };
  });
  const regionIndex = new Map(regions.map((region) => [region.name, region]));

  const nodes: GraphNodePosition[] = concepts.map((concept) => {
    const regionName = preset === 'sphere' ? 'All concepts' : conceptRegion(concept);
    const region = regionIndex.get(regionName) ?? regions[0];
    const seed = `${concept.label}::${concept.tags[0] ?? regionName}`;
    const [a, b, c] = hashParts(seed);
    const radius = 2.2 + Math.cbrt(hashParts(`${seed}:radius`)[0]) * 5.6;
    const theta = a * Math.PI * 2;
    const phi = Math.acos(2 * b - 1);
    const wobble = (c - 0.5) * 2.2;
    return {
      conceptId: concept.id,
      x: region.center.x + radius * Math.sin(phi) * Math.cos(theta),
      y: region.center.y + radius * Math.cos(phi) * 0.85 + wobble,
      z: region.center.z + radius * Math.sin(phi) * Math.sin(theta),
      region: regionName,
      regionIndex: region.index,
      color: region.color,
    };
  });

  return { nodes, regions };
}

export function conceptDegree(project: KnowledgeProject, conceptId: string): number {
  return project.relationships.filter(
    (relationship) =>
      relationship.sourceConceptId === conceptId || relationship.targetConceptId === conceptId,
  ).length;
}

export function buildSearchIndex(project: KnowledgeProject): Array<{
  kind: 'concept' | 'document';
  id: string;
  title: string;
  description: string;
  href: string;
  meta: string;
  searchText: string;
}> {
  return [
    ...project.concepts.map((concept) => ({
      kind: 'concept' as const,
      id: concept.id,
      title: concept.label,
      description: concept.description || concept.sourceReferences[0]?.excerpt || 'No description yet.',
      href: `/concepts/${concept.id}`,
      meta: concept.tags.join(' · ') || 'Concept',
      searchText: [concept.label, concept.description, ...concept.aliases, ...concept.tags]
        .join(' ')
        .toLowerCase(),
    })),
    ...project.documents.map((document) => ({
      kind: 'document' as const,
      id: document.id,
      title: document.filename,
      description:
        document.sections[0]?.excerpt ?? `${document.extractedText.slice(0, 220)}`,
      href: `/documents/${document.id}`,
      meta: document.mediaType === 'application/pdf' ? 'PDF document' : 'Markdown document',
      searchText: document.extractedText.toLowerCase(),
    })),
  ];
}
