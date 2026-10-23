import type { DocumentSection, MediaType, ProcessingStatus } from '@/core/domain/types';

export type ParsePhase = 'reading' | 'extracting' | 'finalizing';

export interface ParseProgress {
  phase: ParsePhase;
  progress: number;
  message: string;
}

export interface ParsedDocument {
  filename: string;
  mediaType: MediaType;
  fileSize: number;
  contentHash: string;
  extractedText: string;
  extractionMethod: 'pdf-text' | 'markdown';
  pageCount?: number;
  sections: DocumentSection[];
  warnings: string[];
  processingStatus: ProcessingStatus;
}

export class DocumentParseError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DocumentParseError';
    this.code = code;
  }
}

export interface ParseOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ParseProgress) => void;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('The operation was cancelled.', 'AbortError');
  }
}
