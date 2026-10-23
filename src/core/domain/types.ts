export const SCHEMA_VERSION = 1;
export const PROJECT_FORMAT = 'mindmesh-project';
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_EXTRACTED_TEXT_CHARS = 8_000_000;

export type Id = string;
export type IsoDate = string;

export type MediaType = 'application/pdf' | 'text/markdown';
export type ProcessingStatus = 'pending' | 'ready' | 'warning' | 'error';
export type ExtractionMethod = 'pdf-text' | 'markdown-heading' | 'user' | 'ai';
export type ProvenanceOrigin = 'user' | 'document-structure' | 'ai' | 'imported';
export type ProvenanceStatus = 'suggested' | 'confirmed' | 'rejected';
export type ReviewStatus = 'suggested' | 'confirmed' | 'rejected';

export interface Provenance {
  origin: ProvenanceOrigin;
  status: ProvenanceStatus;
  method?: string;
  provider?: string;
  model?: string;
  createdAt: IsoDate;
}

export interface SourceReference {
  id: Id;
  documentId: Id;
  pageNumber?: number;
  sectionHeading?: string;
  startOffset?: number;
  endOffset?: number;
  excerpt: string;
  extractionMethod: ExtractionMethod;
}

export interface DocumentSection {
  id: Id;
  pageNumber?: number;
  heading?: string;
  headingLevel?: number;
  startOffset: number;
  endOffset: number;
  excerpt: string;
}

export interface DocumentRecord {
  id: Id;
  projectId: Id;
  filename: string;
  mediaType: MediaType;
  fileSize: number;
  contentHash: string;
  importedAt: IsoDate;
  processingStatus: ProcessingStatus;
  extractionWarnings: string[];
  documentVersion: number;
  pageCount?: number;
  extractedText: string;
  extractionMethod: 'pdf-text' | 'markdown';
  sections: DocumentSection[];
}

export interface Concept {
  id: Id;
  projectId: Id;
  label: string;
  description: string;
  aliases: string[];
  sourceReferences: SourceReference[];
  tags: string[];
  provenance: Provenance;
  confidence?: number;
  reviewStatus: ReviewStatus;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export const RELATION_TYPES = [
  'prerequisite',
  'part-of',
  'related-to',
  'contrasts-with',
  'causes',
  'example-of',
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

export interface RelationTypeMeta {
  type: RelationType;
  label: string;
  directional: boolean;
  inverseLabel: string;
  description: string;
}

export const RELATION_TYPE_META: Record<RelationType, RelationTypeMeta> = {
  prerequisite: {
    type: 'prerequisite',
    label: 'Prerequisite',
    directional: true,
    inverseLabel: 'Requires',
    description: 'The source concept is needed to understand the target concept.',
  },
  'part-of': {
    type: 'part-of',
    label: 'Part of',
    directional: true,
    inverseLabel: 'Contains',
    description: 'The source concept is a component of the target concept.',
  },
  'related-to': {
    type: 'related-to',
    label: 'Related to',
    directional: false,
    inverseLabel: 'Related to',
    description: 'A general association without an implied direction.',
  },
  'contrasts-with': {
    type: 'contrasts-with',
    label: 'Contrasts with',
    directional: false,
    inverseLabel: 'Contrasts with',
    description: 'The concepts are meaningfully opposed or commonly confused.',
  },
  causes: {
    type: 'causes',
    label: 'Causes',
    directional: true,
    inverseLabel: 'Caused by',
    description: 'The source concept brings about the target concept or outcome.',
  },
  'example-of': {
    type: 'example-of',
    label: 'Example of',
    directional: true,
    inverseLabel: 'Exemplified by',
    description: 'The source concept is a specific example of the target concept.',
  },
};

export interface Relationship {
  id: Id;
  projectId: Id;
  sourceConceptId: Id;
  targetConceptId: Id;
  relationType: RelationType;
  explanation: string;
  sourceReferences: SourceReference[];
  provenance: Provenance;
  confidence?: number;
  reviewStatus: ReviewStatus;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export type MasteryState = 'new' | 'learning' | 'familiar' | 'mastered';

export interface LearningRecord {
  conceptId: Id;
  projectId: Id;
  attempts: number;
  correctAnswers: number;
  lastReviewedAt?: IsoDate;
  masteryState: MasteryState;
  nextReviewAt?: IsoDate;
}

export type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer';
export type QuizSource = 'user' | 'rules' | 'ai';

export interface QuizQuestion {
  id: Id;
  conceptId?: Id;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation: string;
  sourceReferences: SourceReference[];
}

export interface Quiz {
  id: Id;
  projectId: Id;
  title: string;
  description: string;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  source: QuizSource;
  questions: QuizQuestion[];
}

export interface QuizAnswer {
  questionId: Id;
  conceptId?: Id;
  answer: string;
  correct: boolean;
  answeredAt: IsoDate;
}

export interface QuizAttempt {
  id: Id;
  projectId: Id;
  quizId: Id;
  quizTitle: string;
  startedAt: IsoDate;
  completedAt: IsoDate;
  answers: QuizAnswer[];
  score: number;
  total: number;
}

export interface ProjectPreferences {
  labelMode: 'all' | 'related' | 'selected';
  showRelationships: boolean;
  graphLayoutPreset: 'regions' | 'sphere';
  includeSampleHints: boolean;
}

export interface KnowledgeProject {
  schemaVersion: number;
  projectId: Id;
  name: string;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  documents: DocumentRecord[];
  concepts: Concept[];
  relationships: Relationship[];
  learningRecords: LearningRecord[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  preferences: ProjectPreferences;
}

export interface ProjectSummary {
  projectId: Id;
  name: string;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  documentCount: number;
  conceptCount: number;
  relationshipCount: number;
}

export interface ProjectManifest {
  format: 'mindmesh-project';
  schemaVersion: number;
  exportedAt: IsoDate;
  generator: string;
  includesExtractedText: boolean;
  includesLearningData: boolean;
}

export interface ProjectExport {
  manifest: ProjectManifest;
  project: KnowledgeProject;
}

export interface GraphStats {
  conceptCount: number;
  relationshipCount: number;
  documentCount: number;
  isolatedConcepts: number;
  averageDegree: number;
  relationTypeCounts: Record<RelationType, number>;
  tagCounts: Record<string, number>;
}

export interface GraphNodePosition {
  conceptId: Id;
  x: number;
  y: number;
  z: number;
  region: string;
  regionIndex: number;
  color: string;
}

export interface DocumentImportResult {
  document: DocumentRecord;
  duplicateOf?: string;
}

export interface ConceptInput {
  label: string;
  description?: string;
  aliases?: string[];
  tags?: string[];
  sourceReferences?: SourceReference[];
}

export interface RelationshipInput {
  sourceConceptId: Id;
  targetConceptId: Id;
  relationType: RelationType;
  explanation?: string;
  sourceReferences?: SourceReference[];
}

export interface QuizQuestionInput {
  conceptId?: Id;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation?: string;
  sourceReferences?: SourceReference[];
}

export interface AIReviewItem {
  id: Id;
  kind: 'concept' | 'relationship';
  concept: Concept;
  relatedLabel?: string;
  relationship?: Relationship;
  sourceDocumentId?: string;
  status: 'pending' | 'accepted' | 'rejected';
}
