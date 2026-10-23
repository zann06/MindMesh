import type { DocumentRecord, SourceReference } from '@/core/domain/types';
import { createSourceReference } from '@/core/domain/factory';

export interface DocumentChunk {
  id: string;
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  pageNumber?: number;
  pageEnd?: number;
  sectionHeading?: string;
  sourceReference: SourceReference;
}

export interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
}

export function chunkDocument(
  document: DocumentRecord,
  options: ChunkOptions = {},
): DocumentChunk[] {
  const maxChars = Math.max(1_000, Math.min(12_000, options.maxChars ?? 6_000));
  const overlap = Math.max(0, Math.min(1_000, options.overlapChars ?? 400));
  if (!document.extractedText.trim()) return [];

  const chunks: DocumentChunk[] = [];
  const sections =
    document.sections.length > 0
      ? document.sections
      : [
          {
            id: 'fallback',
            startOffset: 0,
            endOffset: document.extractedText.length,
            excerpt: document.extractedText.slice(0, 1200),
          },
        ];

  for (const section of sections) {
    const sectionText = document.extractedText.slice(section.startOffset, section.endOffset);
    if (!sectionText.trim()) continue;
    let cursor = 0;
    while (cursor < sectionText.length) {
      const end = Math.min(sectionText.length, cursor + maxChars);
      const text = sectionText.slice(cursor, end);
      if (text.trim()) {
        const startOffset = section.startOffset + cursor;
        const endOffset = section.startOffset + end;
        const chunkId = `chunk_${document.id.slice(-8)}_${chunks.length + 1}`;
        const { id: _ignoredId, ...referenceFields } = createSourceReference({
          documentId: document.id,
          ...(section.pageNumber !== undefined ? { pageNumber: section.pageNumber } : {}),
          ...(section.heading ? { sectionHeading: section.heading } : {}),
          startOffset,
          endOffset,
          excerpt: text.trim().slice(0, 1200),
          extractionMethod: document.extractionMethod === 'pdf-text' ? 'pdf-text' : 'markdown-heading',
        });
        chunks.push({
          id: chunkId,
          index: chunks.length,
          text,
          startOffset,
          endOffset,
          ...(section.pageNumber !== undefined ? { pageNumber: section.pageNumber } : {}),
          ...(section.pageNumber !== undefined ? { pageEnd: section.pageNumber } : {}),
          ...(section.heading ? { sectionHeading: section.heading } : {}),
          sourceReference: {
            ...referenceFields,
            id: `chunk_ref_${document.id.slice(-8)}_${chunks.length + 1}`,
          },
        });
      }
      if (end >= sectionText.length) break;
      cursor = Math.max(end - overlap, cursor + 1);
    }
  }

  return chunks;
}

export function makeChunkSourceReference(
  document: DocumentRecord,
  chunk: DocumentChunk,
  quote?: string,
): SourceReference {
  if (quote?.trim()) {
    const index = chunk.text.indexOf(quote);
    if (index >= 0) {
      return createSourceReference({
        documentId: document.id,
        ...(chunk.pageNumber !== undefined ? { pageNumber: chunk.pageNumber } : {}),
        ...(chunk.sectionHeading ? { sectionHeading: chunk.sectionHeading } : {}),
        startOffset: chunk.startOffset + index,
        endOffset: chunk.startOffset + index + quote.length,
        excerpt: quote.slice(0, 4000),
        extractionMethod: 'ai',
      });
    }
  }
  return {
    ...chunk.sourceReference,
    extractionMethod: 'ai',
  };
}
