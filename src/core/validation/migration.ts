import { z } from 'zod';
import { SCHEMA_VERSION } from '@/core/domain/types';
import { newId, nowIso } from '@/lib/utils';
import {
  knowledgeProjectSchema,
  projectExportSchema,
  projectManifestSchema,
} from './schemas';
import { ProjectValidationError, validateProjectIntegrity } from './integrity';
import type { ProjectExport } from '@/core/domain/types';
import type { ProjectIssue } from './integrity';

export class UnsupportedSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedSchemaError';
  }
}

function zodIssues(error: z.ZodError): ProjectIssue[] {
  return error.issues.map((issue) => ({
    code: 'schema',
    message: issue.message,
    path: issue.path.join('.') || '(root)',
    severity: 'error',
  }));
}

function migrateV0ToV1(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw;
  const input = raw as Record<string, unknown>;
  const timestamp = nowIso();
  return {
    ...input,
    schemaVersion: 1,
    projectId: typeof input.projectId === 'string' ? input.projectId : newId('prj'),
    name: typeof input.name === 'string' && input.name.trim() ? input.name : 'Imported project',
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : timestamp,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : timestamp,
    documents: Array.isArray(input.documents) ? input.documents : [],
    concepts: Array.isArray(input.concepts) ? input.concepts : [],
    relationships: Array.isArray(input.relationships) ? input.relationships : [],
    learningRecords: Array.isArray(input.learningRecords) ? input.learningRecords : [],
    quizzes: Array.isArray(input.quizzes) ? input.quizzes : [],
    attempts: Array.isArray(input.attempts) ? input.attempts : [],
    preferences:
      typeof input.preferences === 'object' && input.preferences !== null
        ? input.preferences
        : {
            labelMode: 'related',
            showRelationships: true,
            graphLayoutPreset: 'regions',
            includeSampleHints: true,
          },
  };
}

const migrations: Array<{ from: number; to: number; migrate: (raw: unknown) => unknown }> = [
  { from: 0, to: 1, migrate: migrateV0ToV1 },
];

/**
 * Migrates a raw project object forward to the current schema. Never guesses at
 * a version newer than this build supports, because silently downgrading graph
 * data is worse than failing safely.
 */
export function migrateProject(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw;
  const versionValue = (raw as Record<string, unknown>).schemaVersion;
  let version =
    typeof versionValue === 'number' && Number.isInteger(versionValue) && versionValue >= 0
      ? versionValue
      : 0;
  if (version > SCHEMA_VERSION) {
    throw new UnsupportedSchemaError(
      `This project uses schema version ${version}, but this build supports up to ${SCHEMA_VERSION}. Update MindMesh before importing it.`,
    );
  }
  let current: unknown = raw;
  while (version < SCHEMA_VERSION) {
    const migration = migrations.find((candidate) => candidate.from === version);
    if (!migration) {
      throw new UnsupportedSchemaError(
        `No migration path exists from schema version ${version} to ${SCHEMA_VERSION}.`,
      );
    }
    current = migration.migrate(current);
    version = migration.to;
  }
  return current;
}

export function parseProject(raw: unknown): ProjectExport['project'] {
  const migrated = migrateProject(raw);
  const parsed = knowledgeProjectSchema.safeParse(migrated);
  if (!parsed.success) {
    throw new ProjectValidationError(
      'The project data does not match the expected MindMesh schema.',
      zodIssues(parsed.error),
    );
  }
  return parsed.data;
}

export function parseProjectExportFile(raw: unknown): ProjectExport {
  const envelope = projectExportSchema.safeParse(raw);
  if (envelope.success) {
    const project = parseProject(envelope.data.project);
    if (envelope.data.manifest.schemaVersion !== project.schemaVersion) {
      throw new ProjectValidationError('Manifest and project schema versions do not match.', [
        {
          code: 'manifest-version',
          message: 'Manifest schemaVersion must equal project.schemaVersion.',
          path: 'manifest.schemaVersion',
          severity: 'error',
        },
      ]);
    }
    const integrity = validateProjectIntegrity(project);
    const errors = integrity.filter((issue) => issue.severity === 'error');
    if (errors.length > 0) {
      throw new ProjectValidationError(
        `The project failed integrity checks (${errors.length} error${errors.length === 1 ? '' : 's'}). No data was imported.`,
        integrity,
      );
    }
    return { manifest: envelope.data.manifest, project };
  }

  const bareProject = knowledgeProjectSchema.safeParse(migrateProject(raw));
  if (!bareProject.success) {
    const manifestAttempt = projectManifestSchema.safeParse(raw);
    throw new ProjectValidationError(
      manifestAttempt.success
        ? 'The file contains a manifest but no valid project data.'
        : 'This file is not a valid MindMesh project export.',
      zodIssues(bareProject.error),
    );
  }
  const project = bareProject.data;
  const integrity = validateProjectIntegrity(project);
  const errors = integrity.filter((issue) => issue.severity === 'error');
  if (errors.length > 0) {
    throw new ProjectValidationError(
      `The project failed integrity checks (${errors.length} error${errors.length === 1 ? '' : 's'}). No data was imported.`,
      integrity,
    );
  }
  return {
    manifest: {
      format: 'mindmesh-project',
      schemaVersion: project.schemaVersion,
      exportedAt: nowIso(),
      generator: 'MindMesh (bare project import)',
      includesExtractedText: project.documents.some((document) => document.extractedText.length > 0),
      includesLearningData: project.learningRecords.length > 0 || project.attempts.length > 0,
    },
    project,
  };
}
