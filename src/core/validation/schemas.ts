import { z } from 'zod';
import { RELATION_TYPES, SCHEMA_VERSION, PROJECT_FORMAT } from '@/core/domain/types';

const id = z.string().min(1).max(180);
const isoTimestamp = z.string().min(1).max(64);
const mediumText = z.string().max(20_000);
const longText = z.string().max(8_000_000);
const excerpt = z.string().max(4_000);

export const provenanceSchema = z
  .object({
    origin: z.enum(['user', 'document-structure', 'ai', 'imported']),
    status: z.enum(['suggested', 'confirmed', 'rejected']),
    method: z.string().max(200).optional(),
    provider: z.string().max(120).optional(),
    model: z.string().max(200).optional(),
    createdAt: isoTimestamp,
  })
  .strict();

export const sourceReferenceSchema = z
  .object({
    id,
    documentId: id,
    pageNumber: z.number().int().positive().optional(),
    sectionHeading: z.string().max(500).optional(),
    startOffset: z.number().int().nonnegative().optional(),
    endOffset: z.number().int().nonnegative().optional(),
    excerpt,
    extractionMethod: z.enum(['pdf-text', 'markdown-heading', 'user', 'ai']),
  })
  .strict()
  .refine(
    (value) =>
      value.startOffset === undefined ||
      value.endOffset === undefined ||
      value.endOffset >= value.startOffset,
    { message: 'Source reference endOffset must be after startOffset' },
  );

export const documentSectionSchema = z
  .object({
    id,
    pageNumber: z.number().int().positive().optional(),
    heading: z.string().max(500).optional(),
    headingLevel: z.number().int().min(1).max(6).optional(),
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().nonnegative(),
    excerpt,
  })
  .strict()
  .refine((value) => value.endOffset >= value.startOffset, {
    message: 'Section endOffset must be after startOffset',
  });

export const documentSchema = z
  .object({
    id,
    projectId: id,
    filename: z.string().min(1).max(500),
    mediaType: z.enum(['application/pdf', 'text/markdown']),
    fileSize: z.number().int().nonnegative().max(100_000_000),
    contentHash: z.string().min(1).max(128),
    importedAt: isoTimestamp,
    processingStatus: z.enum(['pending', 'ready', 'warning', 'error']),
    extractionWarnings: z.array(z.string().max(1_000)).max(50),
    documentVersion: z.number().int().positive(),
    pageCount: z.number().int().positive().optional(),
    extractedText: longText,
    extractionMethod: z.enum(['pdf-text', 'markdown']),
    sections: z.array(documentSectionSchema).max(20_000),
  })
  .strict();

export const conceptSchema = z
  .object({
    id,
    projectId: id,
    label: z.string().trim().min(1).max(300),
    description: mediumText,
    aliases: z.array(z.string().max(300)).max(30),
    sourceReferences: z.array(sourceReferenceSchema).max(50),
    tags: z.array(z.string().max(100)).max(30),
    provenance: provenanceSchema,
    confidence: z.number().min(0).max(1).optional(),
    reviewStatus: z.enum(['suggested', 'confirmed', 'rejected']),
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
  })
  .strict();

export const relationshipSchema = z
  .object({
    id,
    projectId: id,
    sourceConceptId: id,
    targetConceptId: id,
    relationType: z.enum(RELATION_TYPES),
    explanation: mediumText,
    sourceReferences: z.array(sourceReferenceSchema).max(50),
    provenance: provenanceSchema,
    confidence: z.number().min(0).max(1).optional(),
    reviewStatus: z.enum(['suggested', 'confirmed', 'rejected']),
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
  })
  .strict()
  .refine((value) => value.sourceConceptId !== value.targetConceptId, {
    message: 'A relationship cannot link a concept to itself',
  });

export const learningRecordSchema = z
  .object({
    conceptId: id,
    projectId: id,
    attempts: z.number().int().nonnegative(),
    correctAnswers: z.number().int().nonnegative(),
    lastReviewedAt: isoTimestamp.optional(),
    masteryState: z.enum(['new', 'learning', 'familiar', 'mastered']),
    nextReviewAt: isoTimestamp.optional(),
  })
  .strict()
  .refine((value) => value.correctAnswers <= value.attempts, {
    message: 'Correct answers cannot exceed attempts',
  });

export const quizQuestionSchema = z
  .object({
    id,
    conceptId: id.optional(),
    type: z.enum(['multiple-choice', 'true-false', 'short-answer']),
    prompt: z.string().trim().min(1).max(5_000),
    options: z.array(z.string().max(1_000)).min(2).max(8).optional(),
    correctAnswer: z.string().trim().min(1).max(5_000),
    acceptedAnswers: z.array(z.string().max(1_000)).max(20).optional(),
    explanation: z.string().max(5_000),
    sourceReferences: z.array(sourceReferenceSchema).max(20),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.type === 'multiple-choice') {
      if (!value.options || value.options.length < 2) {
        context.addIssue({
          code: 'custom',
          message: 'Multiple-choice questions need at least two options',
          path: ['options'],
        });
      } else if (!value.options.includes(value.correctAnswer)) {
        context.addIssue({
          code: 'custom',
          message: 'The correct answer must be one of the options',
          path: ['correctAnswer'],
        });
      }
    }
    if (value.type === 'true-false') {
      if (value.correctAnswer !== 'True' && value.correctAnswer !== 'False') {
        context.addIssue({
          code: 'custom',
          message: 'True/false answers must be True or False',
          path: ['correctAnswer'],
        });
      }
    }
  });

export const quizSchema = z
  .object({
    id,
    projectId: id,
    title: z.string().trim().min(1).max(300),
    description: z.string().max(2_000),
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
    source: z.enum(['user', 'rules', 'ai']),
    questions: z.array(quizQuestionSchema).min(1).max(200),
  })
  .strict();

export const quizAnswerSchema = z
  .object({
    questionId: id,
    conceptId: id.optional(),
    answer: z.string().max(5_000),
    correct: z.boolean(),
    answeredAt: isoTimestamp,
  })
  .strict();

export const quizAttemptSchema = z
  .object({
    id,
    projectId: id,
    quizId: id,
    quizTitle: z.string().max(300),
    startedAt: isoTimestamp,
    completedAt: isoTimestamp,
    answers: z.array(quizAnswerSchema).max(200),
    score: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  })
  .strict();

export const projectPreferencesSchema = z
  .object({
    labelMode: z.enum(['all', 'related', 'selected']),
    showRelationships: z.boolean(),
    graphLayoutPreset: z.enum(['regions', 'sphere']),
    includeSampleHints: z.boolean(),
  })
  .strict();

export const knowledgeProjectSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    projectId: id,
    name: z.string().trim().min(1).max(200),
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
    documents: z.array(documentSchema).max(2_000),
    concepts: z.array(conceptSchema).max(20_000),
    relationships: z.array(relationshipSchema).max(80_000),
    learningRecords: z.array(learningRecordSchema).max(20_000),
    quizzes: z.array(quizSchema).max(2_000),
    attempts: z.array(quizAttemptSchema).max(20_000),
    preferences: projectPreferencesSchema,
  })
  .strict();

export const projectManifestSchema = z
  .object({
    format: z.literal(PROJECT_FORMAT),
    schemaVersion: z.number().int().positive(),
    exportedAt: isoTimestamp,
    generator: z.string().max(200),
    includesExtractedText: z.boolean(),
    includesLearningData: z.boolean(),
  })
  .strict();

export const projectExportSchema = z
  .object({
    manifest: projectManifestSchema,
    project: knowledgeProjectSchema,
  })
  .strict();

export const aiConceptSuggestionSchema = z
  .object({
    label: z.string().trim().min(1).max(300),
    description: z.string().trim().max(5_000).default(''),
    aliases: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
    tags: z.array(z.string().trim().min(1).max(100)).max(12).default([]),
    chunkId: z.string().trim().min(1).max(120),
    quotedEvidence: z.string().trim().max(1_500).default(''),
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();

export const aiRelationshipSuggestionSchema = z
  .object({
    sourceLabel: z.string().trim().min(1).max(300),
    targetLabel: z.string().trim().min(1).max(300),
    relationType: z.enum(RELATION_TYPES),
    explanation: z.string().trim().max(2_000),
    chunkId: z.string().trim().min(1).max(120),
    quotedEvidence: z.string().trim().max(1_500).default(''),
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();

export const aiAnalysisSchema = z
  .object({
    concepts: z.array(aiConceptSuggestionSchema).max(40).default([]),
    relationships: z.array(aiRelationshipSuggestionSchema).max(60).default([]),
  })
  .strict();

export const aiSummarySchema = z
  .object({
    summary: z.string().trim().min(1).max(4_000),
    keyPoints: z.array(z.string().trim().min(1).max(500)).max(12),
    chunkIds: z.array(z.string().trim().min(1).max(120)).max(30),
  })
  .strict();

export const aiQuizSchema = z
  .object({
    questions: z
      .array(
        z
          .object({
            type: z.enum(['multiple-choice', 'true-false', 'short-answer']),
            prompt: z.string().trim().min(1).max(2_000),
            options: z.array(z.string().trim().min(1).max(500)).min(2).max(6).optional(),
            correctAnswer: z.string().trim().min(1).max(2_000),
            acceptedAnswers: z.array(z.string().trim().min(1).max(1_000)).max(10).optional(),
            explanation: z.string().trim().max(2_000),
            conceptLabel: z.string().trim().max(300).optional(),
            chunkId: z.string().trim().min(1).max(120),
            quotedEvidence: z.string().trim().max(1_500).default(''),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();

export const bridgeHealthSchema = z
  .object({
    ok: z.boolean(),
    service: z.literal('mindmesh-bridge'),
    version: z.string(),
    opencode: z.object({
      installed: z.boolean(),
      version: z.string().optional(),
      error: z.string().optional(),
    }),
    limits: z.object({
      maxPromptChars: z.number().int().positive(),
      requestTimeoutMs: z.number().int().positive(),
    }),
  })
  .strict();

export const bridgeModelsSchema = z
  .object({
    models: z.array(z.string().min(1).max(300)).max(2_000),
    truncated: z.boolean().optional(),
  })
  .strict();

export const bridgeGenerateResponseSchema = z
  .object({
    text: z.string(),
    model: z.string(),
    usage: z
      .object({
        inputTokens: z.number().nonnegative().optional(),
        outputTokens: z.number().nonnegative().optional(),
        cost: z.number().nonnegative().optional(),
        reportedByProvider: z.boolean(),
      })
      .optional(),
    durationMs: z.number().nonnegative(),
  })
  .strict();

export type AIConceptSuggestion = z.infer<typeof aiConceptSuggestionSchema>;
export type AIRelationshipSuggestion = z.infer<typeof aiRelationshipSuggestionSchema>;
export type AIAnalysis = z.infer<typeof aiAnalysisSchema>;
export type AISummary = z.infer<typeof aiSummarySchema>;
export type AIQuiz = z.infer<typeof aiQuizSchema>;

export { SCHEMA_VERSION };
