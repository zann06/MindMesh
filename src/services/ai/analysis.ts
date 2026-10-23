import { aiAnalysisSchema, type AIAnalysis } from '@/core/validation/schemas';
import { createConcept, createRelationship, aiProvenance } from '@/core/domain/factory';
import type { Concept, DocumentRecord, KnowledgeProject, Relationship } from '@/core/domain/types';
import { normalizeLabel } from '@/services/graph-engine/graph';
import { buildCacheKey, LocalStorageAICache, type AICache } from './cache';
import { chunkDocument, makeChunkSourceReference, type DocumentChunk } from './chunking';
import {
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisPrompt,
  PROMPT_VERSION,
} from './prompts';
import {
  AIProviderError,
  type AIProvider,
  type AIUsage,
} from './types';

export interface AnalysisProviderInfo {
  providerId: string;
  providerLabel: string;
  model: string;
}

export interface AnalyzeOptions {
  consentToSendContent: boolean;
  signal?: AbortSignal;
  cache?: AICache;
  maxChunks?: number;
  maxOutputTokens?: number;
  onProgress?: (progress: { current: number; total: number; message: string }) => void;
}

export interface AnalysisResult {
  documentId: string;
  concepts: Concept[];
  relationships: Relationship[];
  warnings: string[];
  cacheHits: number;
  chunksAnalyzed: number;
  chunksTotal: number;
  usage?: AIUsage;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function findQuote(chunk: DocumentChunk, quote: string): boolean {
  if (!quote.trim()) return false;
  return (
    chunk.text.includes(quote) ||
    normalizeWhitespace(chunk.text).includes(normalizeWhitespace(quote))
  );
}

function mergeUsage(current: AIUsage | undefined, next: AIUsage | undefined): AIUsage | undefined {
  if (!next?.reportedByProvider) return current;
  if (!current) return { ...next, reportedByProvider: true };
  return {
    inputTokens: (current.inputTokens ?? 0) + (next.inputTokens ?? 0),
    outputTokens: (current.outputTokens ?? 0) + (next.outputTokens ?? 0),
    cost: (current.cost ?? 0) + (next.cost ?? 0),
    reportedByProvider: true,
  };
}

function relationshipKey(
  relationType: Relationship['relationType'],
  a: string,
  b: string,
): string {
  const pair =
    relationType === 'related-to' || relationType === 'contrasts-with'
      ? [a, b].sort().join('::')
      : `${a}->${b}`;
  return `${relationType}::${pair}`;
}

export async function analyzeDocumentWithAI(
  project: KnowledgeProject,
  document: DocumentRecord,
  provider: AIProvider,
  info: AnalysisProviderInfo,
  options: AnalyzeOptions,
): Promise<AnalysisResult> {
  if (!options.consentToSendContent) {
    throw new AIProviderError(
      'not-configured',
      'Explicit consent is required before document content is sent to an AI provider.',
      { code: 'consent-required' },
    );
  }
  if (!document.extractedText.trim()) {
    throw new AIProviderError(
      'unavailable',
      'This document has no extractable text to analyze. Scanned PDFs require OCR, which is not included.',
      { code: 'no-text' },
    );
  }
  const allChunks = chunkDocument(document, { maxChars: 6_000, overlapChars: 350 });
  const maxChunks = Math.max(1, Math.min(12, options.maxChunks ?? 8));
  const chunks = allChunks.slice(0, maxChunks);
  const warnings: string[] = [];
  if (allChunks.length > chunks.length) {
    warnings.push(
      `Only the first ${chunks.length} of ${allChunks.length} chunks were analyzed in this run to keep cost and latency bounded.`,
    );
  }

  const cache = options.cache ?? new LocalStorageAICache();
  const drafts: Concept[] = [];
  const draftsByLabel = new Map<string, Concept>();
  const acceptedRelationshipKeys = new Set<string>();
  const relationshipDrafts: Relationship[] = [];
  let cacheHits = 0;
  let usage: AIUsage | undefined;
  let chunksAnalyzed = 0;

  const existingConcepts = project.concepts.filter(
    (concept) => concept.reviewStatus !== 'rejected',
  );
  for (const concept of existingConcepts) {
    draftsByLabel.set(normalizeLabel(concept.label), concept);
  }

  for (let index = 0; index < chunks.length; index += 1) {
    if (options.signal?.aborted) {
      throw new DOMException('The operation was cancelled.', 'AbortError');
    }
    const chunk = chunks[index];
    options.onProgress?.({
      current: index,
      total: chunks.length,
      message: `Analyzing evidence chunk ${index + 1} of ${chunks.length}…`,
    });

    const allowedLabels = [
      ...existingConcepts.map((concept) => concept.label),
      ...drafts.map((concept) => concept.label),
    ];
    const prompt = buildAnalysisPrompt({
      chunk,
      allowedLabels: [...new Set(allowedLabels)],
      documentName: document.filename,
    });
    const cacheKey = await buildCacheKey({
      operation: 'concept-analysis',
      promptVersion: PROMPT_VERSION,
      provider: info.providerId,
      model: info.model,
      documentHash: document.contentHash,
      documentVersion: document.documentVersion,
      chunk: chunk.text,
    });

    let analysis: AIAnalysis | null = null;
    const cached = await cache.get(cacheKey);
    if (cached) {
      try {
        const parsed = aiAnalysisSchema.safeParse(JSON.parse(cached));
        if (parsed.success) {
          analysis = parsed.data;
          cacheHits += 1;
        }
      } catch {
        // Treat corrupt cache entries as misses.
      }
    }
    if (!analysis) {
      const result = await provider.generateStructuredOutput({
        prompt,
        system: ANALYSIS_SYSTEM_PROMPT,
        schema: aiAnalysisSchema,
        schemaName: 'MindMesh analysis',
        maxOutputTokens: options.maxOutputTokens ?? 2_500,
        signal: options.signal,
      });
      analysis = result.data;
      usage = mergeUsage(usage, result.usage);
      await cache.set(cacheKey, JSON.stringify(analysis));
    }
    chunksAnalyzed += 1;

    for (const suggestion of analysis.concepts) {
      const label = suggestion.label.trim();
      const norm = normalizeLabel(label);
      if (!norm) continue;
      if (draftsByLabel.has(norm)) continue;
      if (!suggestion.quotedEvidence.trim()) {
        warnings.push(
          `Skipped AI concept "${label}" because it did not include a verifiable source quotation.`,
        );
        continue;
      }
      if (!findQuote(chunk, suggestion.quotedEvidence)) {
        warnings.push(
          `Skipped AI concept "${label}" because its quoted evidence could not be found in the source chunk.`,
        );
        continue;
      }
      const sourceReference = makeChunkSourceReference(
        document,
        chunk,
        suggestion.quotedEvidence,
      );
      const concept = createConcept(
        project.projectId,
        {
          label,
          description: suggestion.description,
          aliases: suggestion.aliases,
          tags: suggestion.tags,
          sourceReferences: [sourceReference],
        },
        {
          provenance: aiProvenance(
            'AI concept extraction',
            info.providerLabel,
            info.model,
          ),
          reviewStatus: 'suggested',
        },
      );
      if (suggestion.confidence !== undefined) concept.confidence = suggestion.confidence;
      drafts.push(concept);
      draftsByLabel.set(norm, concept);
    }

    const existingRelationshipKeys = new Set(
      project.relationships.map((relationship) =>
        relationshipKey(
          relationship.relationType,
          relationship.sourceConceptId,
          relationship.targetConceptId,
        ),
      ),
    );

    for (const suggestion of analysis.relationships) {
      const source = draftsByLabel.get(normalizeLabel(suggestion.sourceLabel));
      const target = draftsByLabel.get(normalizeLabel(suggestion.targetLabel));
      if (!source || !target) {
        warnings.push(
          `Skipped AI relationship "${suggestion.sourceLabel}" → "${suggestion.targetLabel}" because an endpoint is not in the graph.`,
        );
        continue;
      }
      if (source.id === target.id) {
        warnings.push(
          `Skipped self-referential AI relationship for "${source.label}".`,
        );
        continue;
      }
      const key = relationshipKey(suggestion.relationType, source.id, target.id);
      if (acceptedRelationshipKeys.has(key)) continue;
      const existingKey = relationshipKey(
        suggestion.relationType,
        source.id,
        target.id,
      );
      if (existingRelationshipKeys.has(existingKey)) continue;

      if (suggestion.quotedEvidence.trim() && !findQuote(chunk, suggestion.quotedEvidence)) {
        warnings.push(
          `Skipped AI relationship "${suggestion.sourceLabel}" → "${suggestion.targetLabel}" because its quoted evidence could not be found in the source chunk.`,
        );
        continue;
      }
      const hasQuote = suggestion.quotedEvidence.trim().length > 0;
      const sourceReference = makeChunkSourceReference(
        document,
        chunk,
        hasQuote ? suggestion.quotedEvidence : undefined,
      );
      const relationship = createRelationship(
        project.projectId,
        {
          sourceConceptId: source.id,
          targetConceptId: target.id,
          relationType: suggestion.relationType,
          explanation: hasQuote
            ? suggestion.explanation
            : `AI inference (no direct quotation): ${suggestion.explanation}`,
          sourceReferences: [sourceReference],
        },
        {
          provenance: aiProvenance(
            hasQuote ? 'AI relationship suggestion' : 'AI relationship inference',
            info.providerLabel,
            info.model,
          ),
          reviewStatus: 'suggested',
        },
      );
      if (suggestion.confidence !== undefined) relationship.confidence = suggestion.confidence;
      relationshipDrafts.push(relationship);
      acceptedRelationshipKeys.add(key);
    }
  }

  options.onProgress?.({
    current: chunks.length,
    total: chunks.length,
    message: 'Analysis complete. Review suggestions before adding them.',
  });

  return {
    documentId: document.id,
    concepts: drafts,
    relationships: relationshipDrafts,
    warnings: warnings.slice(0, 30),
    cacheHits,
    chunksAnalyzed,
    chunksTotal: allChunks.length,
    ...(usage ? { usage } : {}),
  };
}
