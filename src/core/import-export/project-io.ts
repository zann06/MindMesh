import { newId, nowIso, slugify } from '@/lib/utils';
import { PROJECT_FORMAT, SCHEMA_VERSION } from '@/core/domain/types';
import type {
  KnowledgeProject,
  ProjectExport,
  Quiz,
  SourceReference,
} from '@/core/domain/types';
import { assertProjectValid } from '@/core/validation/integrity';
import { parseProjectExportFile } from '@/core/validation/migration';

export interface ExportOptions {
  includeExtractedText: boolean;
  includeLearningData: boolean;
}

export function buildProjectExport(
  project: KnowledgeProject,
  options: ExportOptions,
): ProjectExport {
  const exported: KnowledgeProject = {
    ...structuredClone(project),
    schemaVersion: SCHEMA_VERSION,
    documents: project.documents.map((document) => ({
      ...structuredClone(document),
      extractedText: options.includeExtractedText ? document.extractedText : '',
    })),
    learningRecords: options.includeLearningData ? structuredClone(project.learningRecords) : [],
    attempts: options.includeLearningData ? structuredClone(project.attempts) : [],
  };
  return {
    manifest: {
      format: PROJECT_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowIso(),
      generator: 'MindMesh 0.1.0',
      includesExtractedText: options.includeExtractedText,
      includesLearningData: options.includeLearningData,
    },
    project: exported,
  };
}

export function exportFilename(project: KnowledgeProject): string {
  const base = slugify(project.name) || 'mindmesh-project';
  const date = new Date().toISOString().slice(0, 10);
  return `${base}-${date}.mindmesh.json`;
}

function remapReference(
  reference: SourceReference,
  documentIds: Map<string, string>,
): SourceReference {
  return {
    ...reference,
    id: newId('src'),
    documentId: documentIds.get(reference.documentId) ?? reference.documentId,
  };
}

/**
 * Importing always creates a new project and remaps every cross-entity id.
 * An imported file can never merge into, overwrite, or partially corrupt an
 * existing workspace.
 */
export function cloneImportedProject(source: KnowledgeProject, suffix = ''): KnowledgeProject {
  const projectId = newId('prj');
  const documentIds = new Map(source.documents.map((document) => [document.id, newId('doc')]));
  const conceptIds = new Map(source.concepts.map((concept) => [concept.id, newId('con')]));
  const relationshipIds = new Map(
    source.relationships.map((relationship) => [relationship.id, newId('rel')]),
  );
  const quizIds = new Map(source.quizzes.map((quiz) => [quiz.id, newId('quiz')]));
  const questionIds = new Map(
    source.quizzes.flatMap((quiz) =>
      quiz.questions.map((question) => [question.id, newId('qst')] as const),
    ),
  );

  const quizzes: Quiz[] = source.quizzes.map((quiz) => ({
    ...structuredClone(quiz),
    id: quizIds.get(quiz.id) ?? newId('quiz'),
    projectId,
    createdAt: quiz.createdAt,
    updatedAt: nowIso(),
    questions: quiz.questions.map((question) => ({
      ...structuredClone(question),
      id: questionIds.get(question.id) ?? newId('qst'),
      ...(question.conceptId
        ? { conceptId: conceptIds.get(question.conceptId) ?? question.conceptId }
        : {}),
      sourceReferences: question.sourceReferences.map((reference) =>
        remapReference(reference, documentIds),
      ),
    })),
  }));

  const cloned: KnowledgeProject = {
    ...structuredClone(source),
    schemaVersion: SCHEMA_VERSION,
    projectId,
    name: suffix ? `${source.name}${suffix}` : source.name,
    createdAt: source.createdAt,
    updatedAt: nowIso(),
    documents: source.documents.map((document) => ({
      ...structuredClone(document),
      id: documentIds.get(document.id) ?? newId('doc'),
      projectId,
      sections: document.sections.map((section) => ({
        ...section,
        id: newId('sec'),
      })),
    })),
    concepts: source.concepts.map((concept) => ({
      ...structuredClone(concept),
      id: conceptIds.get(concept.id) ?? newId('con'),
      projectId,
      sourceReferences: concept.sourceReferences.map((reference) =>
        remapReference(reference, documentIds),
      ),
    })),
    relationships: source.relationships.map((relationship) => ({
      ...structuredClone(relationship),
      id: relationshipIds.get(relationship.id) ?? newId('rel'),
      projectId,
      sourceConceptId:
        conceptIds.get(relationship.sourceConceptId) ?? relationship.sourceConceptId,
      targetConceptId:
        conceptIds.get(relationship.targetConceptId) ?? relationship.targetConceptId,
      sourceReferences: relationship.sourceReferences.map((reference) =>
        remapReference(reference, documentIds),
      ),
    })),
    learningRecords: source.learningRecords.map((record) => ({
      ...structuredClone(record),
      projectId,
      conceptId: conceptIds.get(record.conceptId) ?? record.conceptId,
    })),
    quizzes,
    attempts: source.attempts.map((attempt) => ({
      ...structuredClone(attempt),
      id: newId('att'),
      projectId,
      quizId: quizIds.get(attempt.quizId) ?? attempt.quizId,
      quizTitle: attempt.quizTitle,
      answers: attempt.answers.map((answer) => ({
        ...answer,
        questionId: questionIds.get(answer.questionId) ?? answer.questionId,
        ...(answer.conceptId
          ? { conceptId: conceptIds.get(answer.conceptId) ?? answer.conceptId }
          : {}),
      })),
    })),
  };

  assertProjectValid(cloned, 'Imported project');
  return cloned;
}

export interface ImportPreview {
  project: KnowledgeProject;
  warnings: string[];
}

export function prepareProjectImport(raw: unknown): ImportPreview {
  const parsed = parseProjectExportFile(raw);
  const cloned = cloneImportedProject(parsed.project, ' (imported)');
  const warnings: string[] = [];
  if (!parsed.manifest.includesExtractedText) {
    warnings.push(
      'This export omitted full extracted text. Evidence excerpts and page references are still available, but full-text search will be limited until documents are re-imported.',
    );
  }
  if (!parsed.manifest.includesLearningData) {
    warnings.push('This export did not include learning history.');
  }
  const unsupported = parsed.project.documents.filter(
    (document) => document.processingStatus === 'error',
  );
  if (unsupported.length > 0) {
    warnings.push(
      `${unsupported.length} imported document${unsupported.length === 1 ? '' : 's'} previously failed extraction and may have no searchable text.`,
    );
  }
  return { project: cloned, warnings };
}
