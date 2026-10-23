import type {
  DocumentRecord,
  DocumentSection,
  SourceReference,
} from '@/core/domain/types';

export function findSectionForReference(
  document: DocumentRecord,
  reference: SourceReference,
): DocumentSection | undefined {
  if (reference.pageNumber !== undefined) {
    const pageSection = document.sections.find(
      (section) => section.pageNumber === reference.pageNumber,
    );
    if (pageSection) return pageSection;
  }
  if (reference.sectionHeading) {
    const headingSection = document.sections.find(
      (section) =>
        section.heading?.toLowerCase().trim() === reference.sectionHeading?.toLowerCase().trim(),
    );
    if (headingSection) return headingSection;
  }
  if (reference.startOffset !== undefined) {
    return document.sections.find(
      (section) =>
        reference.startOffset! >= section.startOffset &&
        reference.startOffset! <= section.endOffset,
    );
  }
  return document.sections[0];
}

export function sourceHref(reference: SourceReference, document?: DocumentRecord): string {
  const params = new URLSearchParams();
  if (document) {
    const section = findSectionForReference(document, reference);
    if (section) params.set('section', section.id);
  }
  if (reference.startOffset !== undefined) params.set('start', String(reference.startOffset));
  if (reference.endOffset !== undefined) params.set('end', String(reference.endOffset));
  if (reference.excerpt) params.set('evidence', '1');
  return `/documents/${reference.documentId}${params.size > 0 ? `?${params.toString()}` : ''}`;
}

export function sourceLabel(reference: SourceReference, document?: DocumentRecord): string {
  if (reference.pageNumber !== undefined) {
    return `${document?.filename ?? 'Document'} · page ${reference.pageNumber}`;
  }
  if (reference.sectionHeading) {
    return `${document?.filename ?? 'Document'} · ${reference.sectionHeading}`;
  }
  return document?.filename ?? 'Document';
}

export function referenceSectionText(
  document: DocumentRecord,
  reference: SourceReference,
): string {
  if (reference.excerpt) return reference.excerpt;
  if (reference.startOffset !== undefined && reference.endOffset !== undefined) {
    return document.extractedText
      .slice(reference.startOffset, reference.endOffset)
      .trim()
      .slice(0, 4000);
  }
  const section = findSectionForReference(document, reference);
  return section?.excerpt ?? '';
}
