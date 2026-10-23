import type {
  DocumentRecord,
  KnowledgeProject,
  Relationship,
  SourceReference,
} from '@/core/domain/types';
import { normalizeLabel } from '@/services/graph-engine/graph';

export type IssueSeverity = 'error' | 'warning';

export interface ProjectIssue {
  code: string;
  message: string;
  path: string;
  severity: IssueSeverity;
}

export class ProjectValidationError extends Error {
  readonly issues: ProjectIssue[];

  constructor(message: string, issues: ProjectIssue[]) {
    super(message);
    this.name = 'ProjectValidationError';
    this.issues = issues;
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function refPath(prefix: string, ref: SourceReference): string {
  return `${prefix}.sourceReferences[${ref.id}]`;
}

export function validateSourceReference(
  ref: SourceReference,
  documents: Map<string, DocumentRecord>,
  path: string,
): ProjectIssue[] {
  const issues: ProjectIssue[] = [];
  const document = documents.get(ref.documentId);
  if (!document) {
    issues.push({
      code: 'missing-document',
      message: `Source reference points to missing document ${ref.documentId}.`,
      path,
      severity: 'error',
    });
    return issues;
  }

  if (ref.pageNumber !== undefined) {
    if (document.mediaType !== 'application/pdf') {
      issues.push({
        code: 'page-on-markdown',
        message: 'Markdown references cannot claim a PDF page number.',
        path,
        severity: 'error',
      });
    } else if (document.pageCount !== undefined && ref.pageNumber > document.pageCount) {
      issues.push({
        code: 'page-out-of-range',
        message: `Page ${ref.pageNumber} does not exist in ${document.filename} (${document.pageCount} pages).`,
        path,
        severity: 'error',
      });
    } else if (!document.sections.some((section) => section.pageNumber === ref.pageNumber)) {
      issues.push({
        code: 'missing-page-section',
        message: `Page ${ref.pageNumber} was not extracted from ${document.filename}.`,
        path,
        severity: 'error',
      });
    }
  }

  if (ref.sectionHeading) {
    const match = document.sections.some(
      (section) =>
        section.heading?.toLowerCase().trim() === ref.sectionHeading?.toLowerCase().trim(),
    );
    if (!match) {
      issues.push({
        code: 'missing-section',
        message: `Section "${ref.sectionHeading}" was not found in ${document.filename}.`,
        path,
        severity: 'error',
      });
    }
  }

  if (document.extractedText.length > 0) {
    if (
      ref.startOffset !== undefined &&
      (ref.startOffset < 0 || ref.startOffset > document.extractedText.length)
    ) {
      issues.push({
        code: 'offset-out-of-range',
        message: 'Source reference start offset is outside the extracted text.',
        path,
        severity: 'error',
      });
    }
    if (
      ref.endOffset !== undefined &&
      (ref.endOffset < 0 || ref.endOffset > document.extractedText.length)
    ) {
      issues.push({
        code: 'offset-out-of-range',
        message: 'Source reference end offset is outside the extracted text.',
        path,
        severity: 'error',
      });
    }
    if (
      ref.startOffset !== undefined &&
      ref.endOffset !== undefined &&
      ref.endOffset > ref.startOffset &&
      ref.excerpt.trim()
    ) {
      const exact = document.extractedText.slice(ref.startOffset, ref.endOffset);
      if (
        normalizeWhitespace(exact) !== normalizeWhitespace(ref.excerpt) &&
        !normalizeWhitespace(document.extractedText).includes(normalizeWhitespace(ref.excerpt))
      ) {
        issues.push({
          code: 'unverified-excerpt',
          message: `The quoted evidence could not be verified against ${document.filename}.`,
          path,
          severity: 'warning',
        });
      }
    }
  }

  return issues;
}

export function validateProjectIntegrity(project: KnowledgeProject): ProjectIssue[] {
  const issues: ProjectIssue[] = [];
  const documents = new Map(project.documents.map((document) => [document.id, document]));
  const concepts = new Map(project.concepts.map((concept) => [concept.id, concept]));

  if (project.schemaVersion < 1) {
    issues.push({
      code: 'schema-version',
      message: 'Project schema version is not supported.',
      path: 'schemaVersion',
      severity: 'error',
    });
  }

  const documentIds = new Set<string>();
  for (const document of project.documents) {
    if (documentIds.has(document.id)) {
      issues.push({
        code: 'duplicate-document-id',
        message: `Duplicate document id ${document.id}.`,
        path: 'documents',
        severity: 'error',
      });
    }
    documentIds.add(document.id);
    if (document.projectId !== project.projectId) {
      issues.push({
        code: 'project-mismatch',
        message: `Document ${document.filename} belongs to a different project.`,
        path: 'documents',
        severity: 'error',
      });
    }
  }

  const conceptIds = new Set<string>();
  for (const concept of project.concepts) {
    if (conceptIds.has(concept.id)) {
      issues.push({
        code: 'duplicate-concept-id',
        message: `Duplicate concept id ${concept.id}.`,
        path: 'concepts',
        severity: 'error',
      });
    }
    conceptIds.add(concept.id);
    if (concept.projectId !== project.projectId) {
      issues.push({
        code: 'project-mismatch',
        message: `Concept "${concept.label}" belongs to a different project.`,
        path: 'concepts',
        severity: 'error',
      });
    }
    for (const ref of concept.sourceReferences) {
      issues.push(...validateSourceReference(ref, documents, refPath(`concepts[${concept.id}]`, ref)));
    }
  }

  const relationshipIds = new Set<string>();
  const relationshipKeys = new Set<string>();
  for (const relationship of project.relationships) {
    if (relationshipIds.has(relationship.id)) {
      issues.push({
        code: 'duplicate-relationship-id',
        message: `Duplicate relationship id ${relationship.id}.`,
        path: 'relationships',
        severity: 'error',
      });
    }
    relationshipIds.add(relationship.id);
    if (relationship.projectId !== project.projectId) {
      issues.push({
        code: 'project-mismatch',
        message: 'A relationship belongs to a different project.',
        path: 'relationships',
        severity: 'error',
      });
    }
    if (!concepts.has(relationship.sourceConceptId)) {
      issues.push({
        code: 'missing-source-concept',
        message: 'A relationship points to a missing source concept.',
        path: `relationships[${relationship.id}]`,
        severity: 'error',
      });
    }
    if (!concepts.has(relationship.targetConceptId)) {
      issues.push({
        code: 'missing-target-concept',
        message: 'A relationship points to a missing target concept.',
        path: `relationships[${relationship.id}]`,
        severity: 'error',
      });
    }
    if (relationship.sourceConceptId === relationship.targetConceptId) {
      issues.push({
        code: 'self-link',
        message: 'A relationship cannot link a concept to itself.',
        path: `relationships[${relationship.id}]`,
        severity: 'error',
      });
    }
    const key = relationshipKey(relationship);
    if (relationshipKeys.has(key)) {
      issues.push({
        code: 'duplicate-relationship',
        message: 'Two relationships describe the same connection.',
        path: `relationships[${relationship.id}]`,
        severity: 'warning',
      });
    }
    relationshipKeys.add(key);
    for (const ref of relationship.sourceReferences) {
      issues.push(
        ...validateSourceReference(
          ref,
          documents,
          refPath(`relationships[${relationship.id}]`, ref),
        ),
      );
    }
  }

  const learningKeys = new Set<string>();
  for (const record of project.learningRecords) {
    if (learningKeys.has(record.conceptId)) {
      issues.push({
        code: 'duplicate-learning-record',
        message: 'Multiple learning records exist for the same concept.',
        path: 'learningRecords',
        severity: 'error',
      });
    }
    learningKeys.add(record.conceptId);
    if (!concepts.has(record.conceptId)) {
      issues.push({
        code: 'orphan-learning-record',
        message: 'A learning record points to a missing concept.',
        path: 'learningRecords',
        severity: 'error',
      });
    }
    if (record.projectId !== project.projectId) {
      issues.push({
        code: 'project-mismatch',
        message: 'A learning record belongs to a different project.',
        path: 'learningRecords',
        severity: 'error',
      });
    }
  }

  const quizIds = new Set<string>();
  for (const quiz of project.quizzes) {
    if (quizIds.has(quiz.id)) {
      issues.push({
        code: 'duplicate-quiz-id',
        message: `Duplicate quiz id ${quiz.id}.`,
        path: 'quizzes',
        severity: 'error',
      });
    }
    quizIds.add(quiz.id);
    if (quiz.projectId !== project.projectId) {
      issues.push({
        code: 'project-mismatch',
        message: 'A quiz belongs to a different project.',
        path: 'quizzes',
        severity: 'error',
      });
    }
    for (const question of quiz.questions) {
      if (question.conceptId && !concepts.has(question.conceptId)) {
        issues.push({
          code: 'orphan-question',
          message: 'A quiz question points to a missing concept.',
          path: `quizzes[${quiz.id}]`,
          severity: 'warning',
        });
      }
      for (const ref of question.sourceReferences) {
        issues.push(
          ...validateSourceReference(ref, documents, refPath(`quizzes[${quiz.id}]`, ref)),
        );
      }
    }
  }

  const duplicateLabels = new Map<string, string>();
  for (const concept of project.concepts) {
    const key = normalizeLabel(concept.label);
    const existing = duplicateLabels.get(key);
    if (existing) {
      issues.push({
        code: 'duplicate-concept-label',
        message: `Concepts "${existing}" and "${concept.label}" normalize to the same label.`,
        path: `concepts[${concept.id}]`,
        severity: 'warning',
      });
    } else {
      duplicateLabels.set(key, concept.label);
    }
  }

  return issues;
}

function relationshipKey(relationship: Relationship): string {
  const pair =
    relationship.relationType === 'related-to' || relationship.relationType === 'contrasts-with'
      ? [relationship.sourceConceptId, relationship.targetConceptId].sort().join('::')
      : `${relationship.sourceConceptId}->${relationship.targetConceptId}`;
  return `${relationship.relationType}::${pair}`;
}

export function assertProjectValid(project: KnowledgeProject, context = 'Project'): void {
  const issues = validateProjectIntegrity(project);
  const errors = issues.filter((issue) => issue.severity === 'error');
  if (errors.length > 0) {
    throw new ProjectValidationError(
      `${context} failed validation with ${errors.length} error${errors.length === 1 ? '' : 's'}.`,
      issues,
    );
  }
}

export function errorIssues(error: unknown): ProjectIssue[] {
  if (error instanceof ProjectValidationError) return error.issues;
  return [];
}
