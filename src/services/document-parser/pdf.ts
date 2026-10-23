import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { newId } from '@/lib/utils';
import type { DocumentSection } from '@/core/domain/types';
import { DocumentParseError, throwIfAborted, type ParseOptions, type ParsedDocument } from './types';

type PdfJsModule = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfJsModule> | null = null;

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

interface ExtractedPage {
  pageNumber: number;
  text: string;
}

function cleanPageText(value: string): string {
  return value
    .replaceAll('\u0000', '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readPdfPages(
  data: Uint8Array,
  options: ParseOptions,
): Promise<{ pages: ExtractedPage[]; pageCount: number }> {
  let loadingTask: PDFDocumentLoadingTask;
  let pdf: PDFDocumentProxy;
  try {
    const pdfjs = await loadPdfJs();
    loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: false,
    });
    pdf = await loadingTask.promise;
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    const message = error instanceof Error ? error.message : String(error);
    if (name === 'PasswordException' || /password/i.test(message)) {
      throw new DocumentParseError(
        'password-protected',
        'This PDF is password-protected. MindMesh does not request or store PDF passwords.',
      );
    }
    if (name === 'InvalidPDFException' || /invalid pdf/i.test(message)) {
      throw new DocumentParseError(
        'invalid-pdf',
        'This file is not a valid PDF, or it is structurally damaged.',
      );
    }
    throw new DocumentParseError(
      'pdf-open-failed',
      `The PDF could not be opened: ${message.slice(0, 240)}`,
    );
  }

  try {
    if (pdf.numPages === 0) {
      throw new DocumentParseError('empty-pdf', 'The PDF contains no pages.');
    }
    const pages: ExtractedPage[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      throwIfAborted(options.signal);
      options.onProgress?.({
        phase: 'extracting',
        progress: 0.25 + (pageNumber / pdf.numPages) * 0.65,
        message: `Extracting page ${pageNumber} of ${pdf.numPages}…`,
      });
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = '';
      let previousEndedWithSpace = true;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const text = item.str;
        if (!text) continue;
        if (!previousEndedWithSpace && !/^[,.;:!?)\]}]/.test(text)) {
          pageText += ' ';
        }
        pageText += text;
        if (item.hasEOL) {
          pageText += '\n';
          previousEndedWithSpace = true;
        } else {
          previousEndedWithSpace = /\s$/.test(text);
        }
      }
      pages.push({ pageNumber, text: cleanPageText(pageText) });
      page.cleanup();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return { pages, pageCount: pdf.numPages };
  } catch (error) {
    if (error instanceof DocumentParseError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new DocumentParseError(
      'pdf-extract-failed',
      `Text extraction failed: ${error instanceof Error ? error.message.slice(0, 240) : 'unknown PDF error'}`,
    );
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}

export async function parsePdfBuffer(
  buffer: ArrayBuffer,
  options: ParseOptions = {},
): Promise<Pick<ParsedDocument, 'extractedText' | 'sections' | 'warnings' | 'processingStatus' | 'pageCount'>> {
  throwIfAborted(options.signal);
  options.onProgress?.({ phase: 'extracting', progress: 0.2, message: 'Opening PDF…' });
  const { pages, pageCount } = await readPdfPages(new Uint8Array(buffer), options);
  throwIfAborted(options.signal);

  const sections: DocumentSection[] = [];
  const warnings: string[] = [];
  let extractedText = '';
  let blankPages = 0;

  for (const page of pages) {
    if (extractedText.length > 0) extractedText += '\n\n';
    const startOffset = extractedText.length;
    if (page.text) {
      extractedText += page.text;
    } else {
      blankPages += 1;
    }
    const endOffset = extractedText.length;
    sections.push({
      id: newId('sec'),
      pageNumber: page.pageNumber,
      startOffset,
      endOffset,
      excerpt: page.text ? page.text.slice(0, 1200) : 'No extractable text on this page.',
    });
  }

  if (blankPages > 0) {
    warnings.push(
      `${blankPages} page${blankPages === 1 ? '' : 's'} contained no extractable text. Those pages may be scanned images. MindMesh does not include OCR.`,
    );
  }
  if (!extractedText.trim()) {
    warnings.push(
      'No selectable text was found. This is likely an image-only or scanned PDF. OCR is not included in this build, so the document can be stored but not searched or cited.',
    );
    sections.length = 0;
  }

  options.onProgress?.({ phase: 'finalizing', progress: 0.95, message: 'Preparing page evidence…' });
  return {
    extractedText,
    sections,
    warnings,
    pageCount,
    processingStatus: warnings.length > 0 || !extractedText.trim() ? 'warning' : 'ready',
  };
}
