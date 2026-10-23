import { useId, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, ShieldCheck, Upload, X } from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { useCopy } from '@/app/language-store';
import { toast } from '@/app/toast-store';
import { Button } from '@/components/ui/button';
import { Notice, ProgressBar } from '@/components/ui/states';
import { cn, errorMessage } from '@/lib/utils';
import { DocumentParseError, type ParseProgress } from '@/services/document-parser';
import { MAX_FILE_SIZE_BYTES, type DocumentRecord } from '@/core/domain/types';

const copy = {
  en: {
    startingImport: 'Starting import…',
    duplicateTitle: 'This document is already imported',
    duplicateDescription: (filename: string) =>
      `"${filename}" has the same content fingerprint in this project.`,
    importedTitle: 'Document imported',
    importedWarning: (filename: string, count: number) =>
      `${filename} was imported with ${count} extraction warning${count === 1 ? '' : 's'}.`,
    importedReady: (filename: string) =>
      `${filename} is searchable and ready for evidence links.`,
    cancelledTitle: 'Import cancelled',
    cancelledDescription: 'The file was not added to your project.',
    dropTitle: 'Drop a PDF or Markdown file',
    dropDescription:
      'Up to 25 MB. Extracted text, page numbers, and heading sections stay in your browser.',
    chooseFile: 'Choose file',
    chooseSr: 'Choose a PDF or Markdown document',
    cancel: 'Cancel',
    noUpload: 'No upload. No AI request on import.',
    progressLabel: 'Document import progress',
    failedTitle: 'Import failed',
    supported: (maxMb: number) =>
      `Supported: PDF and Markdown. Image-only PDFs are detected, but OCR is not included. Maximum file size: ${maxMb} MB.`,
  },
  id: {
    startingImport: 'Memulai impor…',
    duplicateTitle: 'Dokumen ini sudah diimpor',
    duplicateDescription: (filename: string) =>
      `"${filename}" memiliki sidik jari konten yang sama di proyek ini.`,
    importedTitle: 'Dokumen diimpor',
    importedWarning: (filename: string, count: number) =>
      `${filename} diimpor dengan ${count} peringatan ekstraksi.`,
    importedReady: (filename: string) =>
      `${filename} dapat dicari dan siap untuk tautan bukti.`,
    cancelledTitle: 'Impor dibatalkan',
    cancelledDescription: 'File tidak ditambahkan ke proyek Anda.',
    dropTitle: 'Letakkan file PDF atau Markdown',
    dropDescription:
      'Hingga 25 MB. Teks hasil ekstraksi, nomor halaman, dan bagian judul tetap berada di browser Anda.',
    chooseFile: 'Pilih file',
    chooseSr: 'Pilih dokumen PDF atau Markdown',
    cancel: 'Batal',
    noUpload: 'Tanpa unggah. Tanpa permintaan AI saat impor.',
    progressLabel: 'Progres impor dokumen',
    failedTitle: 'Impor gagal',
    supported: (maxMb: number) =>
      `Didukung: PDF dan Markdown. PDF hanya-gambar terdeteksi, tetapi OCR tidak disertakan. Ukuran file maksimum: ${maxMb} MB.`,
  },
};

export function ImportPanel({
  onImported,
  navigateOnSuccess = true,
  compact = false,
}: {
  onImported?: (document: DocumentRecord) => void;
  navigateOnSuccess?: boolean;
  compact?: boolean;
}) {
  const c = useCopy(copy);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  const importDocument = useWorkspaceStore((state) => state.importDocument);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    setProgress({ phase: 'reading', progress: 0.01, message: c.startingImport });
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await importDocument(file, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      if (result.duplicateOf) {
        toast.info(
          c.duplicateTitle,
          c.duplicateDescription(result.document.filename),
        );
        if (navigateOnSuccess) navigate(`/documents/${result.document.id}`);
        return;
      }
      toast.success(
        c.importedTitle,
        result.document.extractionWarnings.length > 0
          ? c.importedWarning(
              result.document.filename,
              result.document.extractionWarnings.length,
            )
          : c.importedReady(result.document.filename),
      );
      onImported?.(result.document);
      if (navigateOnSuccess) navigate(`/documents/${result.document.id}`);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        toast.info(c.cancelledTitle, c.cancelledDescription);
      } else if (caught instanceof DocumentParseError) {
        setError(caught.message);
      } else {
        setError(errorMessage(caught));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-2xl border border-dashed transition-colors',
          dragging
            ? 'border-cyan-300/70 bg-cyan-400/[0.06]'
            : 'border-line bg-[#0d0f14]/40 hover:border-slate-500/60',
          compact ? 'p-4' : 'p-6 sm:p-8',
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.md,.markdown,application/pdf,text/markdown"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <div className={cn('flex flex-col items-center text-center', compact ? 'gap-2' : 'gap-3')}>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-200">
            <FileUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-bright">{c.dropTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{c.dropDescription}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Upload className="h-3.5 w-3.5" />}
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {c.chooseFile}
            </Button>
            <label htmlFor={inputId} className="sr-only">
              {c.chooseSr}
            </label>
            {busy ? (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X className="h-3.5 w-3.5" />}
                onClick={() => abortRef.current?.abort()}
              >
                {c.cancel}
              </Button>
            ) : null}
          </div>
          <p className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {c.noUpload}
          </p>
        </div>
      </div>

      {busy && progress ? (
        <div className="mt-3 rounded-xl border border-line-soft bg-[#0d0f14]/60 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-300">{progress.message}</span>
            <span className="text-slate-500">{Math.round(progress.progress * 100)}%</span>
          </div>
          <ProgressBar value={progress.progress} label={c.progressLabel} />
        </div>
      ) : null}

      {error ? (
        <div className="mt-3">
          <Notice tone="error" title={c.failedTitle}>
            {error}
          </Notice>
        </div>
      ) : null}

      <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
        {c.supported(Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024))}
      </p>
    </div>
  );
}
