import { marked, type Token } from 'marked';
import { newId } from '@/lib/utils';
import type { DocumentSection } from '@/core/domain/types';
import { DocumentParseError, throwIfAborted, type ParseOptions, type ParsedDocument } from './types';

interface LooseToken {
  type: string;
  raw?: string;
  text?: string;
  href?: string;
  title?: string | null;
  tokens?: LooseToken[];
  items?: LooseToken[];
  header?: Array<{ tokens?: LooseToken[]; text?: string }>;
  rows?: Array<Array<{ tokens?: LooseToken[]; text?: string }>>;
  depth?: number;
  ordered?: boolean;
  start?: number;
  lang?: string;
  checked?: boolean;
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, ' ');
}

function inlineText(tokens?: LooseToken[], fallback = ''): string {
  if (!tokens || tokens.length === 0) return fallback;
  return tokens
    .map((token) => {
      switch (token.type) {
        case 'text':
        case 'escape':
          return token.tokens ? inlineText(token.tokens, token.text ?? '') : (token.text ?? '');
        case 'strong':
        case 'em':
        case 'del':
          return inlineText(token.tokens, token.text ?? '');
        case 'codespan':
          return token.text ?? '';
        case 'link': {
          const label = inlineText(token.tokens, token.text ?? token.href ?? '');
          return token.href && token.href !== label ? `${label} (${token.href})` : label;
        }
        case 'image':
          return token.text ?? token.title ?? '';
        case 'br':
          return '\n';
        case 'html':
          return stripHtml(token.text ?? '');
        case 'checkbox':
          return token.checked ? '[x] ' : '[ ] ';
        default:
          return token.text ?? '';
      }
    })
    .join('');
}

function flattenToken(token: LooseToken, inheritPrefix = ''): string {
  switch (token.type) {
    case 'space':
    case 'hr':
    case 'def':
      return '';
    case 'heading':
      return inlineText(token.tokens, token.text ?? '');
    case 'paragraph':
    case 'text':
      return inlineText(token.tokens, token.text ?? '');
    case 'code':
      return token.text ?? '';
    case 'html':
      return stripHtml(token.text ?? '');
    case 'blockquote':
      return (token.tokens ?? [])
        .map((child) => flattenToken(child))
        .filter(Boolean)
        .join('\n');
    case 'list': {
      const start = typeof token.start === 'number' ? token.start : 1;
      return (token.items ?? [])
        .map((item, index) => {
          const marker = token.ordered ? `${start + index}. ` : '- ';
          const body = flattenToken(item, marker)
            .split('\n')
            .map((line, lineIndex) => (lineIndex === 0 ? `${marker}${line}` : `  ${line}`))
            .join('\n');
          return body;
        })
        .join('\n');
    }
    case 'table': {
      const header = (token.header ?? []).map((cell) => inlineText(cell.tokens, cell.text ?? ''));
      const rows = (token.rows ?? []).map((row) =>
        row.map((cell) => inlineText(cell.tokens, cell.text ?? '')),
      );
      return [header.join(' | '), ...rows.map((row) => row.join(' | '))]
        .filter(Boolean)
        .join('\n');
    }
    default:
      return token.text ? `${inheritPrefix}${token.text}` : '';
  }
}

function plainBlock(token: LooseToken): string {
  if (token.type === 'heading') {
    return `\n${inlineText(token.tokens, token.text ?? '')}\n`;
  }
  const content = flattenToken(token).trim();
  if (!content) return '';
  return `\n${content}\n`;
}

export function parseMarkdownSource(
  source: string,
): Pick<ParsedDocument, 'extractedText' | 'sections' | 'warnings' | 'processingStatus'> {
  const warnings: string[] = [];
  if (!source.trim()) {
    return {
      extractedText: '',
      sections: [],
      warnings: ['The Markdown document is empty.'],
      processingStatus: 'warning',
    };
  }

  const sanitizedSource = source
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const tokens = (marked.lexer(sanitizedSource) as Token[]) as unknown as LooseToken[];
  const sections: Array<{
    heading?: string;
    headingLevel?: number;
    startOffset: number;
    parts: string[];
  }> = [];
  let current: {
    heading?: string;
    headingLevel?: number;
    startOffset: number;
    parts: string[];
  } = { startOffset: 0, parts: [] };
  let text = '';

  const flush = () => {
    if (current.parts.length === 0 && current.heading === undefined) return;
    sections.push(current);
  };

  for (const token of tokens) {
    if (token.type === 'heading') {
      flush();
      const heading = inlineText(token.tokens, token.text ?? '').trim();
      current = {
        ...(heading ? { heading } : {}),
        ...(token.depth ? { headingLevel: token.depth } : {}),
        startOffset: text.length,
        parts: [],
      };
      const block = plainBlock(token);
      current.parts.push(block);
      text += block;
      continue;
    }
    const block = plainBlock(token);
    if (block) {
      current.parts.push(block);
      text += block;
    }
  }
  flush();

  if (!text.trim()) {
    return {
      extractedText: '',
      sections: [],
      warnings: ['No readable text was found in this Markdown document.'],
      processingStatus: 'warning',
    };
  }

  const normalizedSections: DocumentSection[] = [];
  for (const section of sections) {
    const sectionText = section.parts.join('');
    const startOffset = section.startOffset;
    const endOffset = startOffset + sectionText.length;
    if (startOffset >= endOffset) continue;
    const excerpt = sectionText.trim().slice(0, 1200);
    normalizedSections.push({
      id: newId('sec'),
      ...(section.heading ? { heading: section.heading } : {}),
      ...(section.headingLevel ? { headingLevel: section.headingLevel } : {}),
      startOffset,
      endOffset,
      excerpt: excerpt || section.heading || '(empty section)',
    });
  }

  if (normalizedSections.length === 0) {
    normalizedSections.push({
      id: newId('sec'),
      startOffset: 0,
      endOffset: text.length,
      excerpt: text.trim().slice(0, 1200),
    });
  }

  const headingCount = normalizedSections.filter((section) => section.heading).length;
  if (headingCount === 0) {
    warnings.push(
      'No Markdown headings were found. The whole document is stored as one section.',
    );
  }

  return {
    extractedText: text,
    sections: normalizedSections,
    warnings,
    processingStatus: warnings.length > 0 ? 'warning' : 'ready',
  };
}

export async function parseMarkdownFile(
  file: File,
  options: ParseOptions = {},
): Promise<ParsedDocument> {
  throwIfAborted(options.signal);
  options.onProgress?.({ phase: 'reading', progress: 0.1, message: 'Reading Markdown file…' });
  let source: string;
  try {
    source = await file.text();
  } catch {
    throw new DocumentParseError('read-failed', 'The Markdown file could not be read.');
  }
  throwIfAborted(options.signal);
  options.onProgress?.({ phase: 'extracting', progress: 0.55, message: 'Parsing headings and sections…' });
  const parsed = parseMarkdownSource(source);
  if (options.signal?.aborted) {
    throw new DOMException('The operation was cancelled.', 'AbortError');
  }
  options.onProgress?.({ phase: 'finalizing', progress: 0.9, message: 'Preparing evidence index…' });
  return {
    filename: file.name,
    mediaType: 'text/markdown',
    fileSize: file.size,
    contentHash: '',
    extractionMethod: 'markdown',
    ...parsed,
  };
}
