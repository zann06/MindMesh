import { MAX_FILE_SIZE_BYTES, type MediaType } from '@/core/domain/types';
import { sha256Hex } from './hash';
import { parseMarkdownFile, parseMarkdownSource } from './markdown';
import { parsePdfBuffer } from './pdf';
import {
  DocumentParseError,
  throwIfAborted,
  type ParseOptions,
  type ParsedDocument,
} from './types';

export { DocumentParseError } from './types';
export { parseMarkdownSource } from './markdown';
export { parsePdfBuffer } from './pdf';
export { sha256Hex } from './hash';
export type { ParseOptions, ParseProgress, ParsedDocument } from './types';

const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd'];
export const ACCEPTED_FILE_TYPES = '.pdf,.md,.markdown';

export function detectMediaType(filename: string, mimeType: string): MediaType | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return 'application/pdf';
  if (
    MARKDOWN_EXTENSIONS.some((extension) => lower.endsWith(extension)) ||
    mimeType === 'text/markdown'
  ) {
    return 'text/markdown';
  }
  return null;
}

export function validateFile(file: File): MediaType {
  if (file.size === 0) {
    throw new DocumentParseError('empty-file', 'This file is empty.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new DocumentParseError(
      'file-too-large',
      `Files must be 25 MB or smaller. This file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
    );
  }
  const mediaType = detectMediaType(file.name, file.type);
  if (!mediaType) {
    throw new DocumentParseError(
      'unsupported-type',
      'MindMesh supports PDF (.pdf) and Markdown (.md, .markdown) files in this build.',
    );
  }
  return mediaType;
}

export async function parseDocumentFile(
  file: File,
  options: ParseOptions = {},
): Promise<ParsedDocument> {
  const mediaType = validateFile(file);
  throwIfAborted(options.signal);
  options.onProgress?.({ phase: 'reading', progress: 0.04, message: 'Reading file and fingerprinting…' });

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new DocumentParseError('read-failed', 'The file could not be read from disk.');
  }
  throwIfAborted(options.signal);
  const contentHash = await sha256Hex(buffer);
  throwIfAborted(options.signal);

  if (mediaType === 'text/markdown') {
    let source: string;
    try {
      source = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    } catch {
      throw new DocumentParseError(
        'decode-failed',
        'This Markdown file could not be decoded as UTF-8 text.',
      );
    }
    const parsed = parseMarkdownSource(source);
    return {
      filename: file.name,
      mediaType,
      fileSize: file.size,
      contentHash,
      extractionMethod: 'markdown',
      ...parsed,
    };
  }

  const parsed = await parsePdfBuffer(buffer, options);
  return {
    filename: file.name,
    mediaType,
    fileSize: file.size,
    contentHash,
    extractionMethod: 'pdf-text',
    ...parsed,
  };
}

/**
 * Kept for integrations and tests that already have file text in memory.
 */
export function parseMarkdownText(text: string): ParsedDocument {
  const parsed = parseMarkdownSource(text);
  return {
    filename: 'untitled.md',
    mediaType: 'text/markdown',
    fileSize: new TextEncoder().encode(text).byteLength,
    contentHash: '',
    extractionMethod: 'markdown',
    ...parsed,
  };
}

export { parseMarkdownFile };
