import type { KnowledgeProject, ProjectSummary } from '@/core/domain/types';

export interface ProjectRepository {
  listProjects(): Promise<ProjectSummary[]>;
  getProject(projectId: string): Promise<KnowledgeProject | null>;
  saveProject(project: KnowledgeProject): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  clear(): Promise<void>;
}

export class StorageError extends Error {
  readonly code: string;

  constructor(code: string, message: string, cause?: unknown) {
    super(message, cause ? { cause } : undefined);
    this.name = 'StorageError';
    this.code = code;
  }
}

export function summarizeProject(project: KnowledgeProject): ProjectSummary {
  return {
    projectId: project.projectId,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    documentCount: project.documents.length,
    conceptCount: project.concepts.length,
    relationshipCount: project.relationships.length,
  };
}

export function normalizeStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') {
      return new StorageError(
        'quota-exceeded',
        'Browser storage is full. Export a project, then delete old documents or projects to free space.',
        error,
      );
    }
    if (error.name === 'VersionError') {
      return new StorageError(
        'version-error',
        'The local database was created by a newer MindMesh version. Export or clear site data before continuing.',
        error,
      );
    }
  }
  return new StorageError(
    'storage-failure',
    error instanceof Error ? error.message : 'Local storage failed unexpectedly.',
    error,
  );
}
