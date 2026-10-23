import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { parsePdfBuffer } from '@/services/document-parser';

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function createPdf(text?: string): Promise<ArrayBuffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  if (text) {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText(text, { x: 72, y: 700, size: 12, font });
  }
  return toArrayBuffer(await pdf.save());
}

describe('PDF text extraction', () => {
  it('extracts selectable text and page evidence without storing the binary', async () => {
    const buffer = await createPdf('MindMesh provenance comes from the source text.');
    const parsed = await parsePdfBuffer(buffer);

    expect(parsed.extractedText).toContain('MindMesh provenance comes from the source text.');
    expect(parsed.pageCount).toBe(1);
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0]).toMatchObject({ pageNumber: 1, startOffset: 0 });
    expect(parsed.sections[0].excerpt).toContain('MindMesh provenance');
    expect(parsed.processingStatus).toBe('ready');
    expect(parsed.warnings).toEqual([]);
  });

  it('reports image-only pages honestly instead of claiming OCR', async () => {
    const parsed = await parsePdfBuffer(await createPdf());

    expect(parsed.extractedText).toBe('');
    expect(parsed.sections).toEqual([]);
    expect(parsed.processingStatus).toBe('warning');
    expect(parsed.warnings.join(' ')).toMatch(/OCR is not included/i);
  });

  it('rejects damaged PDFs with a typed parse error', async () => {
    const invalid = new TextEncoder().encode('this is not a pdf');

    await expect(parsePdfBuffer(toArrayBuffer(invalid))).rejects.toMatchObject({
      name: 'DocumentParseError',
      code: 'invalid-pdf',
    });
  });

  it('honours an already-aborted signal before opening the PDF', async () => {
    const controller = new AbortController();
    controller.abort();
    const buffer = await createPdf('Abort check');

    await expect(
      parsePdfBuffer(buffer, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
