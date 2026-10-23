import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { useCopy } from '@/app/language-store';
import { toast } from '@/app/toast-store';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonClassName } from '@/components/ui/button-styles';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/states';
import { SampleProjectButton } from '@/features/onboarding/sample-button';
import { ImportPanel } from './import-panel';
import { NoProjectPanel } from '@/components/layout/no-project';
import { errorMessage, formatBytes, formatDate } from '@/lib/utils';
import type { DocumentRecord } from '@/core/domain/types';

const copy = {
  en: {
    title: 'Documents',
    localLibrary: 'Your local source library.',
    importDescription:
      'Import source material locally. Text, page numbers, and heading structure stay in this browser.',
    openUniverse: 'Open universe',
    sourceDocuments: 'source documents',
    citablePages: 'citable pages / sections',
    warningCountLabel: (count: number) =>
      count === 1 ? 'document with warnings' : 'documents with warnings',
    importHeading: 'Import source material',
    importNote: 'Importing is local and does not trigger AI analysis.',
    sourceLibrary: 'Source library',
    filterLabel: 'Filter documents by filename',
    filterPlaceholder: 'Filter by filename…',
    noDocumentsTitle: 'No documents yet',
    noDocumentsDescription:
      'Import a PDF or Markdown file to create page- and heading-level evidence. You can also start from the original sample project.',
    backToDashboard: 'Back to dashboard',
    noMatchesTitle: 'No matching documents',
    noMatchesDescription: (query: string) =>
      `Nothing in this project matches "${query}". Clear the filter to see every source.`,
    clearFilter: 'Clear filter',
    warningBadge: (count: number) => `${count} warning${count === 1 ? '' : 's'}`,
    pageCount: (count: number) => `${count} page${count === 1 ? '' : 's'}`,
    sectionCount: (count: number) => `${count} section${count === 1 ? '' : 's'}`,
    citedConcepts: (count: number) => `${count} concept${count === 1 ? '' : 's'} cited`,
    importedAt: (date: string) => `imported ${date}`,
    readAndCite: 'Read & cite',
    deleteAria: (filename: string) => `Delete ${filename}`,
    deleteDocument: 'Delete document',
    privacyNotice:
      'Files are parsed in your browser. Original binaries are not stored in the project or export. Deleting a document removes its extracted text and every evidence reference that points to it; concepts and relationships remain, without that citation.',
    deletedTitle: 'Document deleted',
    deletedDescription: 'Its extracted text and evidence references were removed.',
    deleteError: 'Could not delete the document',
    documentFallback: 'document',
    deleteTitle: (filename: string) => `Delete "${filename}"?`,
    deleteDescription:
      'Extracted text and all source references to this document are removed. Concepts and relationships stay, but lose this citation. This cannot be undone unless you export a backup first.',
    hint: 'Import first; concepts and AI analysis come later.',
  },
  id: {
    title: 'Dokumen',
    localLibrary: 'Pustaka sumber lokal Anda.',
    importDescription:
      'Impor materi sumber secara lokal. Teks, nomor halaman, dan struktur judul tetap berada di browser ini.',
    openUniverse: 'Buka semesta',
    sourceDocuments: 'dokumen sumber',
    citablePages: 'halaman / bagian yang dapat dikutip',
    warningCountLabel: () => 'dokumen dengan peringatan',
    importHeading: 'Impor materi sumber',
    importNote: 'Impor bersifat lokal dan tidak memicu analisis AI.',
    sourceLibrary: 'Pustaka sumber',
    filterLabel: 'Saring dokumen berdasarkan nama file',
    filterPlaceholder: 'Saring berdasarkan nama file…',
    noDocumentsTitle: 'Belum ada dokumen',
    noDocumentsDescription:
      'Impor file PDF atau Markdown untuk membuat bukti tingkat halaman dan judul. Anda juga dapat memulai dari proyek contoh asli.',
    backToDashboard: 'Kembali ke dasbor',
    noMatchesTitle: 'Tidak ada dokumen yang cocok',
    noMatchesDescription: (query: string) =>
      `Tidak ada di proyek ini yang cocok dengan "${query}". Hapus filter untuk melihat semua sumber.`,
    clearFilter: 'Hapus filter',
    warningBadge: (count: number) => `${count} peringatan`,
    pageCount: (count: number) => `${count} halaman`,
    sectionCount: (count: number) => `${count} bagian`,
    citedConcepts: (count: number) => `${count} konsep dikutip`,
    importedAt: (date: string) => `diimpor ${date}`,
    readAndCite: 'Baca & kutip',
    deleteAria: (filename: string) => `Hapus ${filename}`,
    deleteDocument: 'Hapus dokumen',
    privacyNotice:
      'File diurai di browser Anda. Biner asli tidak disimpan dalam proyek atau ekspor. Menghapus dokumen akan menghapus teks hasil ekstraksi dan setiap referensi bukti yang menunjuk ke sana; konsep dan relasi tetap ada, tanpa kutipan tersebut.',
    deletedTitle: 'Dokumen dihapus',
    deletedDescription: 'Teks hasil ekstraksi dan referensi buktinya telah dihapus.',
    deleteError: 'Tidak dapat menghapus dokumen',
    documentFallback: 'dokumen',
    deleteTitle: (filename: string) => `Hapus "${filename}"?`,
    deleteDescription:
      'Teks hasil ekstraksi dan semua referensi sumber ke dokumen ini akan dihapus. Konsep dan relasi tetap ada, tetapi kehilangan kutipan ini. Tindakan ini tidak dapat dibatalkan kecuali Anda mengekspor cadangan terlebih dahulu.',
    hint: 'Impor dulu; konsep dan analisis AI menyusul.',
  },
};

export function DocumentsPage() {
  const c = useCopy(copy);
  const project = useWorkspaceStore((state) => state.activeProject);
  const deleteDocument = useWorkspaceStore((state) => state.deleteDocument);
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<DocumentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const documents = useMemo(() => {
    if (!project) return [];
    const normalized = query.trim().toLowerCase();
    return [...project.documents]
      .filter((document) => !normalized || document.filename.toLowerCase().includes(normalized))
      .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }, [project, query]);

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader title={c.title} description={c.localLibrary} orb="documents" />
        <NoProjectPanel />
      </div>
    );
  }

  const conceptCount = new Map<string, number>();
  for (const concept of project.concepts) {
    for (const reference of concept.sourceReferences) {
      conceptCount.set(reference.documentId, (conceptCount.get(reference.documentId) ?? 0) + 1);
    }
  }
  const warningCount = project.documents.filter(
    (document) => document.extractionWarnings.length > 0,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.title}
        description={c.importDescription}
        orb="documents"
        actions={
          <>
            {project.documents.length === 0 ? <SampleProjectButton /> : null}
            <Link to="/universe" className={buttonClassName('secondary', 'md')}>
              {c.openUniverse}
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-200">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-none text-bright">{project.documents.length}</p>
              <p className="mt-1 text-[11px] text-slate-500">{c.sourceDocuments}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/[0.07] text-violet-200">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-none text-bright">
                {project.documents.reduce((total, document) => total + document.sections.length, 0)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">{c.citablePages}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                warningCount > 0
                  ? 'border-amber-400/25 bg-amber-400/[0.08] text-amber-200'
                  : 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200'
              }`}
            >
              {warningCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-lg font-semibold leading-none text-bright">{warningCount}</p>
              <p className="mt-1 text-[11px] text-slate-500">{c.warningCountLabel(warningCount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="import-heading" className="surface rounded-xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 id="import-heading" className="flex items-center gap-2 text-sm font-semibold text-bright">
              <Upload className="h-4 w-4 text-cyan-300" aria-hidden="true" />
              {c.importHeading}
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">{c.importNote}</p>
          </div>
        </div>
        <ImportPanel compact={project.documents.length > 0} navigateOnSuccess />
      </section>

      <section aria-labelledby="library-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="library-heading" className="text-sm font-semibold text-bright">
            {c.sourceLibrary}
            <span className="ml-2 text-xs font-normal text-slate-500">{documents.length}</span>
          </h2>
          {project.documents.length > 0 ? (
            <label className="relative block w-full sm:w-64">
              <span className="sr-only">{c.filterLabel}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={c.filterPlaceholder}
                className="h-9 pl-9 text-xs"
              />
            </label>
          ) : null}
        </div>

        {project.documents.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title={c.noDocumentsTitle}
            description={c.noDocumentsDescription}
            action={
              <>
                <SampleProjectButton />
                <Link to="/" className={buttonClassName('secondary', 'sm')}>
                  {c.backToDashboard}
                </Link>
              </>
            }
          />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title={c.noMatchesTitle}
            description={c.noMatchesDescription(query.trim())}
            action={
              <Button variant="secondary" size="sm" onClick={() => setQuery('')}>
                {c.clearFilter}
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {documents.map((document) => {
              const citedConcepts = conceptCount.get(document.id) ?? 0;
              const isPdf = document.mediaType === 'application/pdf';
              return (
                <li key={document.id} className="surface rounded-xl p-4 transition-colors hover:border-slate-500/40">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-slate-300">
                      {isPdf ? <FileText className="h-4.5 w-4.5" /> : <BookOpen className="h-4.5 w-4.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          to={`/documents/${document.id}`}
                          className="break-all text-sm font-medium text-bright hover:text-cyan-200"
                        >
                          {document.filename}
                        </Link>
                        <Badge variant={isPdf ? 'violet' : 'cyan'}>{isPdf ? 'PDF' : 'Markdown'}</Badge>
                        {document.extractionWarnings.length > 0 ? (
                          <Badge variant="amber">
                            <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                            {c.warningBadge(document.extractionWarnings.length)}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                        <span>{formatBytes(document.fileSize)}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {document.pageCount
                            ? c.pageCount(document.pageCount)
                            : c.sectionCount(document.sections.length)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{c.citedConcepts(citedConcepts)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{c.importedAt(formatDate(document.importedAt))}</span>
                      </p>
                      {document.extractionWarnings.length > 0 ? (
                        <p className="mt-1.5 line-clamp-1 text-[10px] text-amber-200/70">
                          {document.extractionWarnings[0]}
                        </p>
                      ) : null}
                      <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-600">
                        {document.extractionMethod} · sha256 {document.contentHash.slice(0, 12)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        to={`/documents/${document.id}`}
                        className={buttonClassName('secondary', 'sm')}
                      >
                        {c.readAndCite}
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-rose-300"
                        onClick={() => setPendingDelete(document)}
                        aria-label={c.deleteAria(document.filename)}
                        title={c.deleteDocument}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-2 rounded-xl border border-line-soft bg-white/[0.015] px-4 py-3 text-[10px] leading-relaxed text-slate-600">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300/70" aria-hidden="true" />
        {c.privacyNotice}
      </p>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          setDeleting(true);
          try {
            await deleteDocument(pendingDelete.id);
            toast.success(c.deletedTitle, c.deletedDescription);
            setPendingDelete(null);
          } catch (error) {
            toast.error(c.deleteError, errorMessage(error));
          } finally {
            setDeleting(false);
          }
        }}
        title={c.deleteTitle(pendingDelete?.filename ?? c.documentFallback)}
        description={c.deleteDescription}
        confirmLabel={c.deleteDocument}
        destructive
        loading={deleting}
      />
    </div>
  );
}

export function DocumentsPageHint() {
  const c = useCopy(copy);
  return (
    <p className="flex items-center gap-1.5 text-[10px] text-slate-600">
      <Plus className="h-3 w-3" /> {c.hint}
      <Sparkles className="h-3 w-3" />
    </p>
  );
}
