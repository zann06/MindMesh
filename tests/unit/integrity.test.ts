import { describe, expect, it } from 'vitest';
import {
  createConcept,
  createDocumentRecord,
  createEmptyProject,
  createRelationship,
  createSourceReference,
} from '@/core/domain/factory';
import {
  ProjectValidationError,
  assertProjectValid,
  validateProjectIntegrity,
} from '@/core/validation/integrity';
import type { KnowledgeProject } from '@/core/domain/types';

function projectWithSource(): KnowledgeProject {
  const base = createEmptyProject('Integrity');
  const text = 'Hello world evidence.';
  const document = createDocumentRecord({
    projectId: base.projectId,
    filename: 'notes.md',
    mediaType: 'text/markdown',
    fileSize: text.length,
    contentHash: 'hash',
    extractedText: text,
    extractionMethod: 'markdown',
    sections: [
      {
        id: 'sec_1',
        heading: 'Intro',
        headingLevel: 1,
        startOffset: 0,
        endOffset: 14,
        excerpt: 'Hello world',
      },
    ],
  });
  const reference = createSourceReference({
    documentId: document.id,
    sectionHeading: 'Intro',
    startOffset: 0,
    endOffset: 14,
    excerpt: 'Hello world',
    extractionMethod: 'markdown-heading',
  });
  const alpha = createConcept(base.projectId, {
    label: 'Alpha',
    sourceReferences: [reference],
  });
  const beta = createConcept(base.projectId, { label: 'Beta' });
  return {
    ...base,
    documents: [document],
    concepts: [alpha, beta],
    relationships: [
      createRelationship(base.projectId, {
        sourceConceptId: alpha.id,
        targetConceptId: beta.id,
        relationType: 'related-to',
      }),
    ],
  };
}

function codes(project: KnowledgeProject): string[] {
  return validateProjectIntegrity(project).map((issue) => issue.code);
}

describe('project integrity', () => {
  it('accepts a valid project', () => {
    expect(validateProjectIntegrity(projectWithSource())).toEqual([]);
    expect(() => assertProjectValid(projectWithSource())).not.toThrow();
  });

  it('rejects references to missing documents', () => {
    const project = projectWithSource();
    project.concepts[0].sourceReferences[0].documentId = 'doc_missing';
    const issues = validateProjectIntegrity(project);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'missing-document', severity: 'error' }),
    );
    expect(() => assertProjectValid(project)).toThrow(ProjectValidationError);
  });

  it('rejects a page number on Markdown', () => {
    const project = projectWithSource();
    project.concepts[0].sourceReferences[0].pageNumber = 1;
    expect(codes(project)).toContain('page-on-markdown');
  });

  it('rejects pages outside the PDF and sections that were not extracted', () => {
    const project = projectWithSource();
    const pdf = createDocumentRecord({
      projectId: project.projectId,
      filename: 'paper.pdf',
      mediaType: 'application/pdf',
      fileSize: 100,
      contentHash: 'pdfhash',
      extractedText: 'Page one',
      extractionMethod: 'pdf-text',
      pageCount: 1,
      sections: [
        {
          id: 'sec_pdf',
          pageNumber: 1,
          startOffset: 0,
          endOffset: 8,
          excerpt: 'Page one',
        },
      ],
    });
    project.documents.push(pdf);
    const reference = createSourceReference({
      documentId: pdf.id,
      pageNumber: 4,
      excerpt: 'Page one',
      extractionMethod: 'pdf-text',
    });
    project.concepts[0].sourceReferences = [reference];
    expect(codes(project)).toContain('page-out-of-range');
  });

  it('rejects missing headings', () => {
    const project = projectWithSource();
    project.concepts[0].sourceReferences[0].sectionHeading = 'Missing heading';
    expect(codes(project)).toContain('missing-section');
  });

  it('warns when a quote cannot be verified', () => {
    const project = projectWithSource();
    project.concepts[0].sourceReferences[0].startOffset = 0;
    project.concepts[0].sourceReferences[0].endOffset = 5;
    project.concepts[0].sourceReferences[0].excerpt = 'Not in the document';
    const issues = validateProjectIntegrity(project);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'unverified-excerpt', severity: 'warning' }),
    );
  });

  it('rejects self links and warns about duplicate connections', () => {
    const project = projectWithSource();
    const alpha = project.concepts[0];
    project.relationships.push(
      createRelationship(project.projectId, {
        sourceConceptId: alpha.id,
        targetConceptId: alpha.id,
        relationType: 'related-to',
      }),
    );
    project.relationships.push(
      createRelationship(project.projectId, {
        sourceConceptId: alpha.id,
        targetConceptId: project.concepts[1].id,
        relationType: 'related-to',
      }),
    );
    const issues = validateProjectIntegrity(project);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'self-link', severity: 'error' }),
    );
    const duplicate = issues.find((issue) => issue.code === 'duplicate-relationship');
    expect(duplicate?.severity).toBe('warning');
  });

  it('warns about labels that normalize to the same value', () => {
    const project = projectWithSource();
    project.concepts[1].label = ' ALPHA! ';
    expect(codes(project)).toContain('duplicate-concept-label');
  });

  it('detects duplicate ids and project mismatches', () => {
    const project = projectWithSource();
    project.documents.push(structuredClone(project.documents[0]));
    project.concepts[1].projectId = 'prj_other';
    expect(codes(project)).toContain('duplicate-document-id');
    expect(codes(project)).toContain('project-mismatch');
  });
});
