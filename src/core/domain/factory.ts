import { newId, nowIso } from '@/lib/utils';
import { RELATION_TYPES, SCHEMA_VERSION } from './types';
import type {
  Concept,
  DocumentRecord,
  KnowledgeProject,
  LearningRecord,
  Provenance,
  Quiz,
  QuizQuestion,
  RelationType,
  Relationship,
  RelationshipInput,
  ReviewStatus,
  SourceReference,
  ConceptInput,
  QuizQuestionInput,
} from './types';

export function createEmptyProject(name: string): KnowledgeProject {
  const timestamp = nowIso();
  return {
    schemaVersion: SCHEMA_VERSION,
    projectId: newId('prj'),
    name: name.trim() || 'Untitled knowledge project',
    createdAt: timestamp,
    updatedAt: timestamp,
    documents: [],
    concepts: [],
    relationships: [],
    learningRecords: [],
    quizzes: [],
    attempts: [],
    preferences: {
      labelMode: 'related',
      showRelationships: true,
      graphLayoutPreset: 'regions',
      includeSampleHints: true,
    },
  };
}

export function userProvenance(origin: Provenance['origin'] = 'user'): Provenance {
  return {
    origin,
    status: 'confirmed',
    method: origin === 'user' ? 'Manual entry' : 'Document structure',
    createdAt: nowIso(),
  };
}

export function aiProvenance(method: string, provider: string, model: string): Provenance {
  return {
    origin: 'ai',
    status: 'suggested',
    method,
    provider,
    model,
    createdAt: nowIso(),
  };
}

export function createSourceReference(input: {
  documentId: string;
  pageNumber?: number;
  sectionHeading?: string;
  startOffset?: number;
  endOffset?: number;
  excerpt: string;
  extractionMethod: SourceReference['extractionMethod'];
}): SourceReference {
  return {
    id: newId('src'),
    documentId: input.documentId,
    ...(input.pageNumber !== undefined ? { pageNumber: input.pageNumber } : {}),
    ...(input.sectionHeading ? { sectionHeading: input.sectionHeading } : {}),
    ...(input.startOffset !== undefined ? { startOffset: input.startOffset } : {}),
    ...(input.endOffset !== undefined ? { endOffset: input.endOffset } : {}),
    excerpt: input.excerpt.slice(0, 4000),
    extractionMethod: input.extractionMethod,
  };
}

export function createConcept(
  projectId: string,
  input: ConceptInput,
  options: { provenance?: Provenance; reviewStatus?: ReviewStatus } = {},
): Concept {
  const timestamp = nowIso();
  return {
    id: newId('con'),
    projectId,
    label: input.label.trim(),
    description: (input.description ?? '').trim(),
    aliases: uniqueStrings(input.aliases ?? []),
    sourceReferences: input.sourceReferences ?? [],
    tags: uniqueStrings(input.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    provenance: options.provenance ?? userProvenance(),
    reviewStatus: options.reviewStatus ?? 'confirmed',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createRelationship(
  projectId: string,
  input: RelationshipInput,
  options: { provenance?: Provenance; reviewStatus?: ReviewStatus } = {},
): Relationship {
  const timestamp = nowIso();
  return {
    id: newId('rel'),
    projectId,
    sourceConceptId: input.sourceConceptId,
    targetConceptId: input.targetConceptId,
    relationType: input.relationType,
    explanation: (input.explanation ?? '').trim(),
    sourceReferences: input.sourceReferences ?? [],
    provenance: options.provenance ?? userProvenance(),
    reviewStatus: options.reviewStatus ?? 'confirmed',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createLearningRecord(projectId: string, conceptId: string): LearningRecord {
  return {
    conceptId,
    projectId,
    attempts: 0,
    correctAnswers: 0,
    masteryState: 'new',
  };
}

export function createQuizQuestion(input: QuizQuestionInput): QuizQuestion {
  return {
    id: newId('qst'),
    ...(input.conceptId ? { conceptId: input.conceptId } : {}),
    type: input.type,
    prompt: input.prompt.trim(),
    ...(input.options ? { options: input.options.map((option) => option.trim()) } : {}),
    correctAnswer: input.correctAnswer.trim(),
    ...(input.acceptedAnswers ? { acceptedAnswers: uniqueStrings(input.acceptedAnswers) } : {}),
    explanation: (input.explanation ?? '').trim(),
    sourceReferences: input.sourceReferences ?? [],
  };
}

export function createQuiz(
  projectId: string,
  input: { title: string; description?: string; questions: QuizQuestion[]; source: Quiz['source'] },
): Quiz {
  const timestamp = nowIso();
  return {
    id: newId('quiz'),
    projectId,
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
    source: input.source,
    questions: input.questions,
  };
}

export function createDocumentRecord(input: {
  projectId: string;
  filename: string;
  mediaType: DocumentRecord['mediaType'];
  fileSize: number;
  contentHash: string;
  extractedText: string;
  extractionMethod: DocumentRecord['extractionMethod'];
  pageCount?: number;
  processingStatus?: DocumentRecord['processingStatus'];
  extractionWarnings?: string[];
  sections?: DocumentRecord['sections'];
}): DocumentRecord {
  return {
    id: newId('doc'),
    projectId: input.projectId,
    filename: input.filename,
    mediaType: input.mediaType,
    fileSize: input.fileSize,
    contentHash: input.contentHash,
    importedAt: nowIso(),
    processingStatus: input.processingStatus ?? 'ready',
    extractionWarnings: input.extractionWarnings ?? [],
    documentVersion: 1,
    ...(input.pageCount !== undefined ? { pageCount: input.pageCount } : {}),
    extractedText: input.extractedText,
    extractionMethod: input.extractionMethod,
    sections: input.sections ?? [],
  };
}

export function normalizeRelationType(value: string): RelationType {
  return (RELATION_TYPES as readonly string[]).includes(value)
    ? (value as RelationType)
    : 'related-to';
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
