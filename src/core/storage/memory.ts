import type { KnowledgeProject } from '@/core/domain/types';
import { assertProjectValid } from '@/core/validation/integrity';
import { normalizeStorageError, summarizeProject, type ProjectRepository } from './repository';

export function createMemoryRepository(initial: KnowledgeProject[] = []): ProjectRepository {
  const projects = new Map(initial.map((project) => [project.projectId, structuredClone(project)]));

  return {
    async listProjects() {
      return [...projects.values()]
        .map(summarizeProject)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getProject(projectId) {
      const project = projects.get(projectId);
      return project ? structuredClone(project) : null;
    },
    async saveProject(project) {
      try {
        assertProjectValid(project, 'Project');
        projects.set(project.projectId, structuredClone(project));
      } catch (error) {
        throw normalizeStorageError(error);
      }
    },
    async deleteProject(projectId) {
      projects.delete(projectId);
    },
    async clear() {
      projects.clear();
    },
  };
}
