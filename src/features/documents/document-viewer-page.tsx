import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  FileText,
  Highlighter,
  Link2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { useCopy } from '@/app/language-store';
import { toast } from '@/app/toast-store';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonClassName } from '@/components/ui/button-styles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, Notice } from '@/components/ui/states';
import { NoProjectPanel } from '@/components/layout/no-project';
import { ConceptEditor } from '@/features/knowledge-graph/concept-editor';
import { AIAnalysisPanel } from '@/features/ai/ai-analysis-panel';
import { cn, errorMessage, formatBytes, formatDate } from '@/lib/utils';
import type { DocumentSection } from '@/core/domain/types';

const copy = {
  en: {
    documentTitle: 'Document',
    readSource: 'Read a source document.',
    backToDocuments: 'Back to documents',
    notFoundTitle: 'Document not found',
    notFoundMessage:
      'This document is not in the active workspace. It may have been deleted or belong to another project.',
    openLibrary: 'Open document library',
    conceptFromSection: 'Concept from this section',
    delete: 'Delete',
    eyebrow: (isPdf: boolean, count: number) =>
      `${isPdf ? 'PDF source' : 'Markdown source'} · ${count} citable sections`,
    viewerDescription:
      'Extracted text is shown exactly as indexed. Highlights map to stored offsets, so evidence links remain reproducible.',
    warningsBadge: 'warnings',
    readyBadge: 'ready',
    extractionWarnings: 'Extraction warnings',
    noTextTitle: 'No extractable text',
    noTextDescription:
      'This source has no searchable text layer. OCR is not included, so it cannot be cited or analyzed. Try a text-based PDF or Markdown file.',
    importAnother: 'Import another source',
    showingEvidence: (start?: number, end?: number) =>
      `Showing cited evidence at characters ${start}–${end}.`,
    showFullSection: 'Show full section',
    highlighting: (query: string) => `Highlighting “${query}” in this section.`,
    clear: 'Clear',
    pageLabel: (page: number) => `Page ${page}`,
    sectionOf: (index: number, total: number) => `Section ${index} of ${total}`,
    documentText: 'Document text',
    sourceText: 'Source text',
    charsLabel: (start: string, end: string) => `${start}–${end} chars`,
    extractionNote: (isPdf: boolean) =>
      isPdf
        ? 'Extracted from PDF text layer · no OCR'
        : 'Extracted from Markdown headings · no OCR',
    addConcept: 'Add concept from section',
    sections: 'Sections',
    sectionFallback: (id: string) => `Section ${id.slice(-4)}`,
    citedConcepts: 'Cited concepts',
    noCitedConcepts:
      'No concepts cite this source yet. Create one from a section to build evidence.',
    more: (count: number) => `+${count} more`,
    sourceDetails: 'Source details',
    size: 'Size',
    pages: 'Pages',
    imported: 'Imported',
    method: 'Method',
    version: 'Version',
    deletedTitle: 'Document deleted',
    deletedDescription: 'Its extracted text and evidence references were removed.',
    deleteError: 'Could not delete the document',
    deleteTitle: (filename: string) => `Delete "${filename}"?`,
    deleteDescription:
      'Extracted text and every source reference to this document are removed. Concepts and relationships stay, without this citation.',
    deleteDocument: 'Delete document',
  },
  id: {
    documentTitle: 'Dokumen',
    readSource: 'Baca dokumen sumber.',
    backToDocuments: 'Kembali ke dokumen',
    notFoundTitle: 'Dokumen tidak ditemukan',
    notFoundMessage:
      'Dokumen ini tidak ada di ruang kerja aktif. Mungkin telah dihapus atau milik proyek lain.',
    openLibrary: 'Buka pustaka dokumen',
    conceptFromSection: 'Konsep dari bagian ini',
    delete: 'Hapus',
    eyebrow: (isPdf: boolean, count: number) =>
      `${isPdf ? 'Sumber PDF' : 'Sumber Markdown'} · ${count} bagian dapat dikutip`,
    viewerDescription:
      'Teks hasil ekstraksi ditampilkan persis seperti yang diindeks. Sorotan dipetakan ke offset tersimpan, sehingga tautan bukti tetap dapat direproduksi.',
    warningsBadge: 'peringatan',
    readyBadge: 'siap',
    extractionWarnings: 'Peringatan ekstraksi',
    noTextTitle: 'Tidak ada teks yang dapat diekstrak',
    noTextDescription:
      'Sumber ini tidak memiliki lapisan teks yang dapat dicari. OCR tidak disertakan, sehingga tidak dapat dikutip atau dianalisis. Coba PDF berbasis teks atau file Markdown.',
    importAnother: 'Impor sumber lain',
    showingEvidence: (start?: number, end?: number) =>
      `Menampilkan bukti terkutip pada karakter ${start}–${end}.`,
    showFullSection: 'Tampilkan bagian penuh',
    highlighting: (query: string) => `Menyorot “${query}” di bagian ini.`,
    clear: 'Hapus',
    pageLabel: (page: number) => `Halaman ${page}`,
    sectionOf: (index: number, total: number) => `Bagian ${index} dari ${total}`,
    documentText: 'Teks dokumen',
    sourceText: 'Teks sumber',
    charsLabel: (start: string, end: string) => `${start}–${end} karakter`,
    extractionNote: (isPdf: boolean) =>
      isPdf
        ? 'Diekstrak dari lapisan teks PDF · tanpa OCR'
        : 'Diekstrak dari judul Markdown · tanpa OCR',
    addConcept: 'Tambahkan konsep dari bagian',
    sections: 'Bagian',
    sectionFallback: (id: string) => `Bagian ${id.slice(-4)}`,
    citedConcepts: 'Konsep terkutip',
    noCitedConcepts:
      'Belum ada konsep yang mengutip sumber ini. Buat satu dari bagian untuk membangun bukti.',
    more: (count: number) => `+${count} lainnya`,
    sourceDetails: 'Detail sumber',
    size: 'Ukuran',
    pages: 'Halaman',
    imported: 'Diimpor',
    method: 'Metode',
    version: 'Versi',
    deletedTitle: 'Dokumen dihapus',
    deletedDescription: 'Teks hasil ekstraksi dan referensi buktinya telah dihapus.',
    deleteError: 'Tidak dapat menghapus dokumen',
    deleteTitle: (filename: string) => `Hapus "${filename}"?`,
    deleteDescription:
      'Teks hasil ekstraksi dan setiap referensi sumber ke dokumen ini akan dihapus. Konsep dan relasi tetap ada, tanpa kutipan ini.',
    deleteDocument: 'Hapus dokumen',
  },
};

interface HighlightRange {
  start: number;
  end: number;
}

function HighlightedText({
  text,
  ranges,
  markFirst,
}: {
  text: string;
  ranges: HighlightRange[];
  markFirst?: boolean;
}) {
  if (ranges.length === 0) return <>{text}</>;
  const sorted = [...ranges]
    .map((range) => ({
      start: Math.max(0, Math.min(text.length, range.start)),
      end: Math.max(0, Math.min(text.length, range.end)),
    }))
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start);

  const nodes: ReactNode[] = [];
  let cursor = 0;
  let marked = false;
  for (const range of sorted) {
    if (range.start < cursor) continue;
    if (range.start > cursor) nodes.push(text.slice(cursor, range.start));
    const shouldMark = markFirst && !marked;
    nodes.push(
      <mark
        key={`${range.start}-${range.end}`}
        id={shouldMark ? 'evidence-highlight' : undefined}
        data-evidence-highlight={shouldMark ? 'true' : undefined}
        className="rounded-sm bg-amber-300/20 px-0.5 text-amber-100 ring-1 ring-amber-300/30"
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );
    marked = true;
    cursor = range.end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function queryRanges(text: string, query: string): HighlightRange[] {
  if (!query.trim()) return [];
  const ranges: HighlightRange[] = [];
  const needle = query.trim().toLowerCase();
  const haystack = text.toLowerCase();
  let index = haystack.indexOf(needle);
  while (index !== -1 && ranges.length < 100) {
    ranges.push({ start: index, end: index + needle.length });
    index = haystack.indexOf(needle, index + Math.max(1, needle.length));
  }
  return ranges;
}

export function DocumentViewerPage() {
  const c = useCopy(copy);
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const project = useWorkspaceStore((state) => state.activeProject);
  const deleteDocument = useWorkspaceStore((state) => state.deleteDocument);
  const [createConceptOpen, setCreateConceptOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const document = project?.documents.find((candidate) => candidate.id === documentId);

  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const queryParam = searchParams.get('q') ?? '';
  const requestedSectionId = searchParams.get('section');
  const highlightStart = startParam !== null && Number.isFinite(Number(startParam)) ? Number(startParam) : undefined;
  const highlightEnd = endParam !== null && Number.isFinite(Number(endParam)) ? Number(endParam) : undefined;

  const activeSection = useMemo<DocumentSection | undefined>(() => {
    if (!document || document.sections.length === 0) return undefined;
    const byId = requestedSectionId
      ? document.sections.find((section) => section.id === requestedSectionId)
      : undefined;
    if (byId) return byId;
    if (highlightStart !== undefined) {
      const byOffset = document.sections.find(
        (section) => highlightStart >= section.startOffset && highlightStart <= section.endOffset,
      );
      if (byOffset) return byOffset;
    }
    return document.sections[0];
  }, [document, requestedSectionId, highlightStart]);

  useEffect(() => {
    if (!activeSection || (highlightStart === undefined && !queryParam)) return;
    const timeout = window.setTimeout(() => {
      window.document.getElementById('evidence-highlight')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [activeSection, highlightStart, highlightEnd, queryParam]);

  const citedConcepts = useMemo(() => {
    if (!document || !project) return [];
    return project.concepts.filter((concept) =>
      concept.sourceReferences.some((reference) => reference.documentId === document.id),
    );
  }, [document, project]);

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader title={c.documentTitle} description={c.readSource} orb="documents" />
        <NoProjectPanel />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="space-y-6">
        <Link to="/documents" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-200">
          <ArrowLeft className="h-3.5 w-3.5" /> {c.backToDocuments}
        </Link>
        <ErrorState
          title={c.notFoundTitle}
          message={c.notFoundMessage}
          action={
            <Link to="/documents" className={buttonClassName('secondary', 'sm')}>
              {c.openLibrary}
            </Link>
          }
        />
      </div>
    );
  }

  const sectionText = activeSection
    ? document.extractedText.slice(activeSection.startOffset, activeSection.endOffset)
    : '';
  const evidenceRange =
    activeSection &&
    highlightStart !== undefined &&
    highlightEnd !== undefined &&
    highlightStart >= activeSection.startOffset &&
    highlightEnd <= activeSection.endOffset
      ? { start: highlightStart, end: highlightEnd }
      : null;
  const evidenceInSection = Boolean(evidenceRange);
  const relativeRanges: HighlightRange[] = [];
  if (activeSection) {
    if (evidenceRange) {
      relativeRanges.push({
        start: evidenceRange.start - activeSection.startOffset,
        end: evidenceRange.end - activeSection.startOffset,
      });
    } else if (queryParam) {
      relativeRanges.push(...queryRanges(sectionText, queryParam));
    }
  }

  const switchSection = (sectionId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('section', sectionId);
    next.delete('start');
    next.delete('end');
    next.delete('evidence');
    setSearchParams(next, { replace: true });
  };

  const clearEvidence = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('start');
    next.delete('end');
    next.delete('evidence');
    next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const sectionIndex = activeSection
    ? document.sections.findIndex((section) => section.id === activeSection.id) + 1
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/documents" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-200">
          <ArrowLeft className="h-3.5 w-3.5" /> {c.documentTitle}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setCreateConceptOpen(true)}
            disabled={!activeSection}
          >
            {c.conceptFromSection}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-rose-300"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => setConfirmDelete(true)}
          >
            {c.delete}
          </Button>
        </div>
      </div>

      <PageHeader
        eyebrow={c.eyebrow(document.mediaType === 'application/pdf', document.sections.length)}
        title={document.filename}
        description={c.viewerDescription}
        orb="documents"
        actions={
          <>
            <Badge variant={document.mediaType === 'application/pdf' ? 'violet' : 'cyan'}>
              {document.mediaType === 'application/pdf' ? 'PDF' : 'Markdown'}
            </Badge>
            <Badge variant={document.extractionWarnings.length > 0 ? 'amber' : 'emerald'}>
              {document.extractionWarnings.length > 0 ? c.warningsBadge : c.readyBadge}
            </Badge>
          </>
        }
      />

      {document.extractionWarnings.length > 0 ? (
        <Notice tone="warning" title={c.extractionWarnings}>
          <ul className="space-y-1">
            {document.extractionWarnings.map((warning) => (
              <li key={warning} className="flex gap-1.5">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}

      {!sectionText.trim() ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title={c.noTextTitle}
          description={c.noTextDescription}
          action={
            <Link to="/documents" className={buttonClassName('secondary', 'sm')}>
              {c.importAnother}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            {evidenceInSection ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.055] px-4 py-3 text-[11px] text-amber-100">
                <span className="flex items-center gap-2">
                  <Highlighter className="h-3.5 w-3.5" />
                  {c.showingEvidence(evidenceRange?.start, evidenceRange?.end)}
                </span>
                <button
                  type="button"
                  onClick={clearEvidence}
                  className="rounded text-amber-200 underline decoration-amber-400/40 underline-offset-2 hover:text-white"
                >
                  {c.showFullSection}
                </button>
              </div>
            ) : queryParam ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] px-4 py-3 text-[11px] text-cyan-100">
                <span className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5" />
                  {c.highlighting(queryParam)}
                </span>
                <button type="button" onClick={clearEvidence} className="underline underline-offset-2 hover:text-white">
                  {c.clear}
                </button>
              </div>
            ) : null}

            <article className="surface overflow-hidden rounded-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    {activeSection?.pageNumber
                      ? c.pageLabel(activeSection.pageNumber)
                      : activeSection?.heading
                        ? c.sectionOf(sectionIndex, document.sections.length)
                        : c.documentText}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-bright">
                    {activeSection?.heading ??
                      (activeSection?.pageNumber
                        ? c.pageLabel(activeSection.pageNumber)
                        : c.sourceText)}
                  </p>
                </div>
                <span className="text-[10px] text-slate-600">
                  {activeSection
                    ? c.charsLabel(
                        activeSection.startOffset.toLocaleString(),
                        activeSection.endOffset.toLocaleString(),
                      )
                    : ''}
                </span>
              </div>
              <div className="px-5 py-5 sm:px-7 sm:py-6">
                <div className="whitespace-pre-wrap break-words font-serif text-[15px] leading-[1.85] text-slate-300 selection:bg-cyan-400/20">
                  <HighlightedText
                    text={sectionText}
                    ranges={relativeRanges}
                    markFirst={evidenceInSection || Boolean(queryParam)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-5 py-3">
                <span className="text-[10px] text-slate-600">
                  {c.extractionNote(document.extractionMethod === 'pdf-text')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setCreateConceptOpen(true)}
                >
                  {c.addConcept}
                </Button>
              </div>
            </article>
          </div>

          <aside className="space-y-4">
            <Card className="lg:sticky lg:top-20">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-cyan-300" /> {c.sections}
                  <Badge variant="outline">{document.sections.length}</Badge>
                </CardTitle>
              </CardHeader>
              <div className="max-h-[52vh] overflow-y-auto p-2">
                <ol className="space-y-0.5">
                  {document.sections.map((section) => {
                    const active = section.id === activeSection?.id;
                    return (
                      <li key={section.id}>
                        <button
                          type="button"
                          onClick={() => switchSection(section.id)}
                          aria-current={active ? 'location' : undefined}
                          className={cn(
                            'w-full rounded-md px-2.5 py-2 text-left text-[11px] leading-snug transition-colors',
                            active
                              ? 'bg-cyan-400/10 text-cyan-100'
                              : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
                          )}
                        >
                          <span className="block truncate">
                            {section.pageNumber
                              ? c.pageLabel(section.pageNumber)
                              : section.heading ?? c.sectionFallback(section.id)}
                          </span>
                          {!section.pageNumber && section.headingLevel ? (
                            <span className="mt-0.5 block text-[9px] uppercase tracking-[0.08em] text-slate-600">
                              H{section.headingLevel}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 text-violet-300" /> {c.citedConcepts}
                  <Badge variant="outline">{citedConcepts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {citedConcepts.length === 0 ? (
                  <p className="px-1 py-2 text-[11px] leading-relaxed text-slate-500">
                    {c.noCitedConcepts}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {citedConcepts.slice(0, 20).map((concept) => (
                      <li key={concept.id}>
                        <Link
                          to={`/concepts/${concept.id}`}
                          className="block truncate rounded-md px-2 py-1.5 text-[11px] text-slate-300 hover:bg-white/[0.04] hover:text-cyan-200"
                        >
                          {concept.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {citedConcepts.length > 20 ? (
                  <p className="mt-2 text-[10px] text-slate-600">{c.more(citedConcepts.length - 20)}</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle>{c.sourceDetails}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3 text-[10px] leading-relaxed text-slate-500">
                <p className="flex justify-between gap-2">
                  <span>{c.size}</span>
                  <span className="text-slate-300">{formatBytes(document.fileSize)}</span>
                </p>
                {document.pageCount ? (
                  <p className="flex justify-between gap-2">
                    <span>{c.pages}</span>
                    <span className="text-slate-300">{document.pageCount}</span>
                  </p>
                ) : null}
                <p className="flex justify-between gap-2">
                  <span>{c.sections}</span>
                  <span className="text-slate-300">{document.sections.length}</span>
                </p>
                <p className="flex justify-between gap-2">
                  <span>{c.imported}</span>
                  <span className="text-slate-300">{formatDate(document.importedAt)}</span>
                </p>
                <p className="flex justify-between gap-2">
                  <span>{c.method}</span>
                  <span className="text-slate-300">{document.extractionMethod}</span>
                </p>
                <p className="flex justify-between gap-2">
                  <span>{c.version}</span>
                  <span className="text-slate-300">{document.documentVersion}</span>
                </p>
                <p className="break-all pt-1 font-mono text-[9px] text-slate-600" title={document.contentHash}>
                  sha256 {document.contentHash}
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}

      {document.extractedText.trim() ? <AIAnalysisPanel document={document} /> : null}

      <ConceptEditor
        open={createConceptOpen}
        onClose={() => setCreateConceptOpen(false)}
        defaultDocumentId={document.id}
        defaultSectionId={activeSection?.id}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteDocument(document.id);
            toast.success(c.deletedTitle, c.deletedDescription);
            navigate('/documents');
          } catch (error) {
            toast.error(c.deleteError, errorMessage(error));
          } finally {
            setDeleting(false);
          }
        }}
        title={c.deleteTitle(document.filename)}
        description={c.deleteDescription}
        confirmLabel={c.deleteDocument}
        destructive
        loading={deleting}
      />
    </div>
  );
}
