import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { KnowledgeProject, ProjectSummary } from '@/core/domain/types';
import { parseProject } from '@/core/validation/migration';
import { assertProjectValid } from '@/core/validation/integrity';
import {
  normalizeStorageError,
  summarizeProject,
  type ProjectRepository,
} from './repository';

interface MindMeshDatabase extends DBSchema {
  projects: {
    key: string;
    value: KnowledgeProject;
    indexes: { 'by-updated': string };
  };
}

const DB_VERSION = 1;

export interface IndexedDbRepositoryOptions {
  dbName?: string;
}

export function createIndexedDbRepository(
  options: IndexedDbRepositoryOptions = {},
): ProjectRepository {
  const dbName = options.dbName ?? 'mindmesh';
  let dbPromise: Promise<IDBPDatabase<MindMeshDatabase>> | null = null;

  function getDb(): Promise<IDBPDatabase<MindMeshDatabase>> {
    if (!dbPromise) {
      dbPromise = openDB<MindMeshDatabase>(dbName, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('projects')) {
            const store = db.createObjectStore('projects', { keyPath: 'projectId' });
            store.createIndex('by-updated', 'updatedAt');
          }
        },
        blocked() {
          console.warn('[MindMesh] Local database upgrade is blocked by another tab.');
        },
      }).catch((error: unknown) => {
        dbPromise = null;
        throw normalizeStorageError(error);
      });
    }
    return dbPromise;
  }

  return {
    async listProjects(): Promise<ProjectSummary[]> {
      try {
        const db = await getDb();
        const projects = await db.getAll('projects');
        return projects
          .map(summarizeProject)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      } catch (error) {
        throw normalizeStorageError(error);
      }
    },

    async getProject(projectId: string): Promise<KnowledgeProject | null> {
      try {
        const db = await getDb();
        const raw = await db.get('projects', projectId);
        if (!raw) return null;
        const project = parseProject(raw) as KnowledgeProject;
        assertProjectValid(project, 'Stored project');
        return project;
      } catch (error) {
        if (error instanceof Error && error.name === 'ProjectValidationError') {
          throw normalizeStorageError(error);
        }
        throw normalizeStorageError(error);
      }
    },

    async saveProject(project: KnowledgeProject): Promise<void> {
      try {
        assertProjectValid(project, 'Project');
        const db = await getDb();
        await db.put('projects', project);
      } catch (error) {
        throw normalizeStorageError(error);
      }
    },

    async deleteProject(projectId: string): Promise<void> {
      try {
        const db = await getDb();
        await db.delete('projects', projectId);
      } catch (error) {
        throw normalizeStorageError(error);
      }
    },

    async clear(): Promise<void> {
      try {
        const db = await getDb();
        await db.clear('projects');
      } catch (error) {
        throw normalizeStorageError(error);
      }
    },
  };
}

export const projectRepository: ProjectRepository = createIndexedDbRepository();
