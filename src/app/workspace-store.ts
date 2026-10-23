import { create } from 'zustand';
import type {
  AIReviewItem,
  Concept,
  ConceptInput,
  DocumentImportResult,
  DocumentRecord,
  KnowledgeProject,
  ProjectPreferences,
  ProjectSummary,
  Provenance,
  Quiz,
  QuizAttempt,
  Relationship,
  RelationshipInput,
  ReviewStatus,
} from '@/core/domain/types';
import {
  createConcept,
  createEmptyProject,
  createLearningRecord,
  createRelationship,
  userProvenance,
} from '@/core/domain/factory';
import { assertProjectValid } from '@/core/validation/integrity';
import { prepareProjectImport } from '@/core/import-export/project-io';
import type { ProjectRepository } from '@/core/storage/repository';
import { summarizeProject } from '@/core/storage/repository';
import { projectRepository } from '@/core/storage/indexeddb';
import {
  getActiveProjectId,
  setActiveProjectId,
} from '@/core/storage/browser-settings';
import { parseDocumentFile, type ParseProgress } from '@/services/document-parser';
import {
  addConcept as addConceptToGraph,
  addRelationship as addRelationshipToGraph,
  deleteConcept as deleteConceptFromGraph,
  deleteRelationship as deleteRelationshipFromGraph,
  findConceptByLabel,
  updateConcept as updateConceptInGraph,
  updateRelationship as updateRelationshipInGraph,
} from '@/services/graph-engine/graph';
import type { AnalysisResult } from '@/services/ai/analysis';
import { buildSampleProject } from '@/features/onboarding/sample-data';
import { newId, nowIso } from '@/lib/utils';

interface ImportOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ParseProgress) => void;
}

interface ConceptMutationOptions {
  provenance?: Provenance;
  reviewStatus?: ReviewStatus;
}

interface RelationshipMutationOptions {
  provenance?: Provenance;
  reviewStatus?: ReviewStatus;
}

interface WorkspaceState {
  initialized: boolean;
  loading: boolean;
  projects: ProjectSummary[];
  activeProject: KnowledgeProject | null;
  error: string | null;
  init: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  createProject: (name: string) => Promise<KnowledgeProject>;
  switchProject: (projectId: string) => Promise<void>;
  renameProject: (name: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  updatePreferences: (patch: Partial<ProjectPreferences>) => Promise<void>;
  importDocument: (file: File, options?: ImportOptions) => Promise<DocumentImportResult>;
  deleteDocument: (documentId: string) => Promise<void>;
  addConcept: (
    input: ConceptInput,
    options?: ConceptMutationOptions,
  ) => Promise<Concept>;
  updateConcept: (
    conceptId: string,
    patch: Partial<
      Pick<Concept, 'label' | 'description' | 'aliases' | 'tags' | 'sourceReferences' | 'reviewStatus'>
    >,
  ) => Promise<void>;
  deleteConcept: (conceptId: string) => Promise<void>;
  addRelationship: (
    input: RelationshipInput,
    options?: RelationshipMutationOptions,
  ) => Promise<Relationship>;
  updateRelationship: (
    relationshipId: string,
    patch: Partial<
      Pick<
        Relationship,
        | 'sourceConceptId'
        | 'targetConceptId'
        | 'relationType'
        | 'explanation'
        | 'sourceReferences'
        | 'reviewStatus'
      >
    >,
  ) => Promise<void>;
  deleteRelationship: (relationshipId: string) => Promise<void>;
  acceptAnalysis: (
    analysis: AnalysisResult,
    acceptedConceptIds: Set<string>,
    acceptedRelationshipIds: Set<string>,
  ) => Promise<{ conceptsAdded: number; relationshipsAdded: number; warnings: string[] }>;
  saveQuiz: (quiz: Quiz) => Promise<void>;
  deleteQuiz: (quizId: string) => Promise<void>;
  recordAttempt: (attempt: QuizAttempt) => Promise<void>;
  importProject: (raw: unknown) => Promise<KnowledgeProject>;
  loadSampleProject: () => Promise<KnowledgeProject>;
  clearError: () => void;
  resetWorkspace: () => Promise<void>;
}

let commitQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = commitQueue.then(task, task);
  commitQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function sortSummaries(summaries: ProjectSummary[]): ProjectSummary[] {
  return [...summaries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function updateSummaryList(
  projects: ProjectSummary[],
  project: KnowledgeProject,
): ProjectSummary[] {
  const summary = summarizeProject(project);
  const without = projects.filter((candidate) => candidate.projectId !== project.projectId);
  return sortSummaries([summary, ...without]);
}

export function createWorkspaceStore(repository: ProjectRepository) {
  return create<WorkspaceState>((set, get) => {
    let initPromise: Promise<void> | null = null;
    const requireProject = (): KnowledgeProject => {
      const project = get().activeProject;
      if (!project) {
        throw new Error('Create or open a knowledge project first.');
      }
      return project;
    };

    const commit = async (
      updater: (project: KnowledgeProject) => KnowledgeProject,
    ): Promise<KnowledgeProject> =>
      enqueue(async () => {
        const current = requireProject();
        const next = updater(current);
        assertProjectValid(next, 'Project update');
        await repository.saveProject(next);
        set({
          activeProject: next,
          projects: updateSummaryList(get().projects, next),
          error: null,
        });
        return next;
      });

    const setActive = (project: KnowledgeProject) => {
      setActiveProjectId(project.projectId);
      set({ activeProject: project, error: null });
    };

    const loadProject = async (projectId: string): Promise<KnowledgeProject | null> => {
      const project = await repository.getProject(projectId);
      return project;
    };

    const ensureSummaries = async (): Promise<ProjectSummary[]> => {
      const projects = await repository.listProjects();
      set({ projects: sortSummaries(projects) });
      return projects;
    };

    const initialise = async () => {
      set({ loading: true, error: null });
      try {
        let projects = await ensureSummaries();
        if (projects.length === 0) {
          const project = createEmptyProject('My Knowledge');
          await repository.saveProject(project);
          projects = await ensureSummaries();
          setActiveProjectId(project.projectId);
        }
        const preferred = getActiveProjectId();
        const targetId =
          preferred && projects.some((project) => project.projectId === preferred)
            ? preferred
            : projects[0]?.projectId;
        if (targetId) {
          const active = await loadProject(targetId);
          if (active) setActive(active);
          else throw new Error('The selected project could not be loaded.');
        }
        set({ initialized: true, loading: false });
      } catch (error) {
        set({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'The local workspace could not be loaded.',
        });
      }
    };

    return {
      initialized: false,
      loading: true,
      projects: [],
      activeProject: null,
      error: null,

      init: async () => {
        if (get().initialized && !get().error) return;
        if (!initPromise) {
          initPromise = initialise().finally(() => {
            initPromise = null;
          });
        }
        await initPromise;
      },

      refreshProjects: async () => {
        await ensureSummaries();
      },

      createProject: async (name) => {
        const project = createEmptyProject(name);
        await repository.saveProject(project);
        const projects = await ensureSummaries();
        set({ projects });
        setActive(project);
        return project;
      },

      switchProject: async (projectId) => {
        if (projectId === get().activeProject?.projectId) return;
        set({ loading: true, error: null });
        try {
          const project = await repository.getProject(projectId);
          if (!project) throw new Error('Project not found.');
          setActive(project);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'The project could not be opened.',
          });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      renameProject: async (name) => {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Project name cannot be empty.');
        await commit((project) => ({ ...project, name: trimmed, updatedAt: nowIso() }));
      },

      deleteProject: async (projectId) => {
        await enqueue(async () => {
          await repository.deleteProject(projectId);
          const projects = await repository.listProjects();
          const sorted = sortSummaries(projects);
          set({ projects: sorted });
          if (get().activeProject?.projectId === projectId) {
            const nextId = sorted[0]?.projectId;
            if (nextId) {
              const next = await repository.getProject(nextId);
              if (next) setActive(next);
              else set({ activeProject: null });
            } else {
              set({ activeProject: null });
              try {
                localStorage.removeItem('mindmesh.active-project');
              } catch {
                // Ignore unavailable local storage.
              }
            }
          }
        });
      },

      updatePreferences: async (patch) => {
        await commit((project) => ({
          ...project,
          preferences: { ...project.preferences, ...patch },
          updatedAt: nowIso(),
        }));
      },

      importDocument: async (file, options = {}) => {
        const project = requireProject();
        const parsed = await parseDocumentFile(file, options);
        const duplicate = project.documents.find(
          (document) =>
            document.contentHash === parsed.contentHash &&
            document.filename === parsed.filename,
        );
        if (duplicate) {
          return { document: duplicate, duplicateOf: duplicate.id };
        }
        const document: DocumentRecord = {
          id: newId('doc'),
          projectId: project.projectId,
          filename: parsed.filename,
          mediaType: parsed.mediaType,
          fileSize: parsed.fileSize,
          contentHash: parsed.contentHash,
          importedAt: nowIso(),
          processingStatus: parsed.processingStatus,
          extractionWarnings: parsed.warnings,
          documentVersion: 1,
          ...(parsed.pageCount !== undefined ? { pageCount: parsed.pageCount } : {}),
          extractedText: parsed.extractedText,
          extractionMethod: parsed.extractionMethod,
          sections: parsed.sections,
        };
        await commit((current) => ({
          ...current,
          documents: [...current.documents, document],
          updatedAt: nowIso(),
        }));
        return { document };
      },

      deleteDocument: async (documentId) => {
        await commit((project) => {
          if (!project.documents.some((document) => document.id === documentId)) {
            throw new Error('Document not found.');
          }
          return {
            ...project,
            documents: project.documents.filter((document) => document.id !== documentId),
            concepts: project.concepts.map((concept) => ({
              ...concept,
              sourceReferences: concept.sourceReferences.filter(
                (reference) => reference.documentId !== documentId,
              ),
            })),
            relationships: project.relationships.map((relationship) => ({
              ...relationship,
              sourceReferences: relationship.sourceReferences.filter(
                (reference) => reference.documentId !== documentId,
              ),
            })),
            quizzes: project.quizzes.map((quiz) => ({
              ...quiz,
              questions: quiz.questions.map((question) => ({
                ...question,
                sourceReferences: question.sourceReferences.filter(
                  (reference) => reference.documentId !== documentId,
                ),
              })),
            })),
            updatedAt: nowIso(),
          };
        });
      },

      addConcept: async (input, options = {}) => {
        const project = requireProject();
        const concept = createConcept(project.projectId, input, {
          provenance: options.provenance ?? userProvenance(),
          reviewStatus: options.reviewStatus ?? 'confirmed',
        });
        await commit((current) => addConceptToGraph(current, concept));
        return concept;
      },

      updateConcept: async (conceptId, patch) => {
        await commit((project) => {
          const existing = project.concepts.find((concept) => concept.id === conceptId);
          if (!existing) throw new Error('Concept not found.');
          const reviewStatus = patch.reviewStatus ?? 'confirmed';
          return updateConceptInGraph(project, conceptId, {
            ...patch,
            provenance: {
              ...existing.provenance,
              status: reviewStatus === 'rejected' ? 'rejected' : 'confirmed',
            },
            reviewStatus,
          });
        });
      },

      deleteConcept: async (conceptId) => {
        await commit((project) => deleteConceptFromGraph(project, conceptId));
      },

      addRelationship: async (input, options = {}) => {
        const project = requireProject();
        const relationship = createRelationship(project.projectId, input, {
          provenance: options.provenance ?? userProvenance(),
          reviewStatus: options.reviewStatus ?? 'confirmed',
        });
        await commit((current) => addRelationshipToGraph(current, relationship));
        return relationship;
      },

      updateRelationship: async (relationshipId, patch) => {
        await commit((project) =>
          updateRelationshipInGraph(project, relationshipId, patch),
        );
      },

      deleteRelationship: async (relationshipId) => {
        await commit((project) => deleteRelationshipFromGraph(project, relationshipId));
      },

      acceptAnalysis: async (analysis, acceptedConceptIds, acceptedRelationshipIds) => {
        const warnings: string[] = [];
        let conceptsAdded = 0;
        let relationshipsAdded = 0;

        const next = await commit((project) => {
          let working = project;
          const idMap = new Map<string, string>();
          const acceptedConcepts = analysis.concepts.filter((concept) =>
            acceptedConceptIds.has(concept.id),
          );
          for (const draft of acceptedConcepts) {
            const existing = findConceptByLabel(working.concepts, draft.label);
            if (existing) {
              idMap.set(draft.id, existing.id);
              warnings.push(
                `"${draft.label}" already existed; the AI suggestion was not duplicated.`,
              );
              continue;
            }
            const confirmed: Concept = {
              ...draft,
              provenance: { ...draft.provenance, status: 'confirmed' },
              reviewStatus: 'confirmed',
              updatedAt: nowIso(),
            };
            try {
              working = addConceptToGraph(working, confirmed);
              idMap.set(draft.id, confirmed.id);
              conceptsAdded += 1;
            } catch (error) {
              warnings.push(
                error instanceof Error
                  ? `Could not add "${draft.label}": ${error.message}`
                  : `Could not add "${draft.label}".`,
              );
            }
          }

          for (const draft of analysis.relationships) {
            if (!acceptedRelationshipIds.has(draft.id)) continue;
            const sourceConceptId = idMap.get(draft.sourceConceptId) ?? draft.sourceConceptId;
            const targetConceptId = idMap.get(draft.targetConceptId) ?? draft.targetConceptId;
            if (
              !working.concepts.some((concept) => concept.id === sourceConceptId) ||
              !working.concepts.some((concept) => concept.id === targetConceptId)
            ) {
              warnings.push(
                'Skipped a relationship because one of its concepts was not accepted.',
              );
              continue;
            }
            const confirmed: Relationship = {
              ...draft,
              sourceConceptId,
              targetConceptId,
              provenance: { ...draft.provenance, status: 'confirmed' },
              reviewStatus: 'confirmed',
              updatedAt: nowIso(),
            };
            try {
              working = addRelationshipToGraph(working, confirmed);
              relationshipsAdded += 1;
            } catch (error) {
              warnings.push(
                error instanceof Error
                  ? `Could not add relationship: ${error.message}`
                  : 'Could not add a relationship.',
              );
            }
          }
          working = { ...working, updatedAt: nowIso() };
          return working;
        });

        set({ activeProject: next });
        return { conceptsAdded, relationshipsAdded, warnings };
      },

      saveQuiz: async (quiz) => {
        await commit((project) => {
          const exists = project.quizzes.some((candidate) => candidate.id === quiz.id);
          return {
            ...project,
            quizzes: exists
              ? project.quizzes.map((candidate) =>
                  candidate.id === quiz.id ? { ...quiz, updatedAt: nowIso() } : candidate,
                )
              : [...project.quizzes, quiz],
            updatedAt: nowIso(),
          };
        });
      },

      deleteQuiz: async (quizId) => {
        await commit((project) => ({
          ...project,
          quizzes: project.quizzes.filter((quiz) => quiz.id !== quizId),
          updatedAt: nowIso(),
        }));
      },

      recordAttempt: async (attempt) => {
        await commit((project) => {
          if (project.attempts.some((candidate) => candidate.id === attempt.id)) {
            return project;
          }
          const byConcept = new Map(
            project.learningRecords.map((record) => [record.conceptId, record]),
          );
          for (const answer of attempt.answers) {
            if (!answer.conceptId) continue;
            if (!project.concepts.some((concept) => concept.id === answer.conceptId)) continue;
            const record = {
              ...(byConcept.get(answer.conceptId) ??
                createLearningRecord(project.projectId, answer.conceptId)),
            };
            record.attempts += 1;
            record.correctAnswers += answer.correct ? 1 : 0;
            record.lastReviewedAt = attempt.completedAt;
            const accuracy = record.attempts > 0 ? record.correctAnswers / record.attempts : 0;
            record.masteryState =
              record.attempts >= 5 && accuracy >= 0.8
                ? 'mastered'
                : record.attempts >= 3 && accuracy >= 0.6
                  ? 'familiar'
                  : 'learning';
            const days =
              record.masteryState === 'mastered'
                ? 14
                : record.masteryState === 'familiar'
                  ? 5
                  : 1;
            record.nextReviewAt = new Date(
              Date.now() + days * 24 * 60 * 60 * 1000,
            ).toISOString();
            byConcept.set(answer.conceptId, record);
          }
          return {
            ...project,
            attempts: [...project.attempts, attempt],
            learningRecords: [...byConcept.values()],
            updatedAt: nowIso(),
          };
        });
      },

      importProject: async (raw) => {
        const { project } = prepareProjectImport(raw);
        await repository.saveProject(project);
        const projects = await repository.listProjects();
        set({ projects: sortSummaries(projects) });
        setActive(project);
        return project;
      },

      loadSampleProject: async () => {
        const response = await fetch(
          `${import.meta.env.BASE_URL}samples/mindmesh-sample.md`,
          { cache: 'no-store' },
        );
        if (!response.ok) {
          throw new Error('The sample document could not be loaded from this deployment.');
        }
        const markdown = await response.text();
        const current = get().activeProject;
        const isEmpty =
          !current ||
          (current.documents.length === 0 &&
            current.concepts.length === 0 &&
            current.relationships.length === 0 &&
            current.quizzes.length === 0);
        const base = current && isEmpty ? current : createEmptyProject('MindMesh sample');
        const project = await buildSampleProject(base, markdown);
        assertProjectValid(project, 'Sample project');
        await repository.saveProject(project);
        const projects = await repository.listProjects();
        set({ projects: sortSummaries(projects) });
        setActive(project);
        return project;
      },

      clearError: () => set({ error: null }),

      resetWorkspace: async () => {
        await enqueue(async () => {
          await repository.clear();
          set({ projects: [], activeProject: null });
          try {
            localStorage.removeItem('mindmesh.active-project');
          } catch {
            // Ignore unavailable local storage.
          }
        });
      },
    };
  });
}

export const useWorkspaceStore = createWorkspaceStore(projectRepository);

export interface AIReviewDraft {
  items: AIReviewItem[];
  documentId?: string;
}
