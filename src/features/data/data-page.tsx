import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  Database,
  Download,
  FileJson,
  Lock,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { toast } from '@/app/toast-store';
import { useCopy } from '@/app/language-store';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/form';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { Notice } from '@/components/ui/states';
import {
  buildProjectExport,
  exportFilename,
  prepareProjectImport,
  type ImportPreview,
} from '@/core/import-export/project-io';
import { MAX_EXTRACTED_TEXT_CHARS, type KnowledgeProject } from '@/core/domain/types';
import { errorMessage, formatBytes, formatDate } from '@/lib/utils';

const MAX_IMPORT_BYTES = 100 * 1024 * 1024;

const copy = {
  en: {
    eyebrow: 'Local data ownership',
    title: 'Data & backup',
    description:
      'Everything is stored in this browser. Export a portable JSON backup, import it as a new workspace, or remove local data deliberately.',
    projectBadge: (count: number) => `${count} local project${count === 1 ? '' : 's'}`,
    exportTitle: 'Export project',
    ready: 'ready',
    noProject: 'no project',
    updated: (date: string, schema: number) => `Updated ${date} · schema v${schema}`,
    documents: 'Documents',
    concepts: 'Concepts',
    relationships: 'Relationships',
    quizzes: 'Quizzes',
    attempts: 'Attempts',
    learningRecords: 'Learning records',
    includeText: 'Include extracted document text',
    includeTextDescription:
      'Recommended for full-text search and evidence after re-import. No original files are stored or exported.',
    includeLearning: 'Include learning history',
    includeLearningDescription: 'Attempts, mastery records, and review dates.',
    download: 'Download .mindmesh.json',
    exportNote:
      'Exports contain project data only. Provider mode, bridge tokens, API keys, AI cache, and UI preferences outside the project are excluded.',
    openWorkspace:
      'Open or create a workspace on the dashboard to export it. You can still import a backup below without an active project.',
    importTitle: 'Import backup',
    newWorkspace: 'new workspace',
    importDescription:
      'Import validates the manifest and schema, checks cross-entity integrity, migrates older schema versions, and remaps every ID. It always creates a new project; existing data is never merged or overwritten.',
    backupFile: 'Backup file',
    readingButton: 'Reading backup…',
    chooseBackup: 'Choose backup file',
    readingNote: 'Reading and validating the backup locally. No data leaves this browser.',
    importFailed: 'Import failed',
    acceptedPrefix: 'Accepted:',
    acceptedSuffix: 'or JSON up to 100 MB. Imports do not execute code.',
    localStorageTitle: 'Local storage',
    localStorageBody: (millions: number) =>
      `MindMesh stores one full project record per workspace in IndexedDB. Extracted text can be large; each document is capped at ${millions} million characters. Browsers may evict local data under storage pressure, so export important work.`,
    idbBadge: 'IndexedDB · mindmesh',
    localFirst: 'local-first',
    noAccount: 'no account',
    noServer: 'no server storage',
    danger: 'Danger zone',
    deleteActive: 'Delete the active workspace',
    deleteActiveBody: 'Removes this project and its documents, graph, quizzes, and history.',
    deleteProject: 'Delete project',
    clearAll: 'Clear all local workspaces',
    clearAllBody:
      'Deletes every project in this browser. AI settings and session keys are stored separately and are not deleted here.',
    clearEverything: 'Clear everything',
    importDialogTitle: 'Import this project as a new workspace?',
    importDialogDescription: 'Nothing in your existing projects will be modified.',
    cancel: 'Cancel',
    importProject: 'Import project',
    originalCreated: (date: string, schema: number) =>
      `Original created ${date} · schema v${schema}`,
    sourceRefs: 'Source refs',
    importWarnings: 'Import warnings',
    remapNote:
      'All entity IDs will be remapped. Imported evidence references keep their stored excerpts and offsets; missing full text is reported above.',
    deleteTitle: (name: string) => `Delete "${name}"?`,
    deleteDescription:
      'This removes the project, its documents and extracted text, graph, quizzes, and learning history from this browser. Export a backup first if you may need it.',
    deleteWorkspace: 'Delete workspace',
    clearTitle: 'Clear every local workspace?',
    clearDescription:
      'This permanently deletes all projects from IndexedDB in this browser. AI settings and session keys are stored separately and are not removed. This cannot be undone without a backup.',
    clearConfirm: 'Clear all projects',
    exportedTitle: 'Project exported',
    exportedBody: (size: string) =>
      `${size} written locally. Provider keys and settings are never included.`,
    exportError: 'Could not export the project',
    tooLarge: (size: string) =>
      `The file is ${size}. Import files must be 100 MB or smaller.`,
    importedTitle: 'Project imported',
    importedBody: (name: string) =>
      `${name} was created as a new workspace. Existing projects were not changed.`,
    workspaceDeleted: 'Workspace deleted',
    workspaceDeletedBody: 'Another local project was selected if available.',
    deleteError: 'Could not delete the workspace',
    clearedTitle: 'Local workspaces cleared',
    clearedBody: 'The next visit will start with an empty workspace.',
    clearError: 'Could not clear local data',
    workspace: 'workspace',
  },
  id: {
    eyebrow: 'Kepemilikan data lokal',
    title: 'Data & cadangan',
    description:
      'Semua tersimpan di browser ini. Ekspor cadangan JSON portabel, impor sebagai ruang kerja baru, atau hapus data lokal secara sengaja.',
    projectBadge: (count: number) => `${count} proyek lokal`,
    exportTitle: 'Ekspor proyek',
    ready: 'siap',
    noProject: 'tanpa proyek',
    updated: (date: string, schema: number) => `Diperbarui ${date} · skema v${schema}`,
    documents: 'Dokumen',
    concepts: 'Konsep',
    relationships: 'Relasi',
    quizzes: 'Kuis',
    attempts: 'Percobaan',
    learningRecords: 'Catatan belajar',
    includeText: 'Sertakan teks dokumen hasil ekstraksi',
    includeTextDescription:
      'Disarankan untuk pencarian penuh dan bukti setelah impor ulang. Tidak ada file asli yang disimpan atau diekspor.',
    includeLearning: 'Sertakan riwayat belajar',
    includeLearningDescription: 'Percobaan, catatan penguasaan, dan tanggal ulangan.',
    download: 'Unduh .mindmesh.json',
    exportNote:
      'Ekspor hanya berisi data proyek. Mode penyedia, token bridge, kunci API, cache AI, dan preferensi UI di luar proyek tidak disertakan.',
    openWorkspace:
      'Buka atau buat ruang kerja di dasbor untuk mengekspornya. Anda tetap dapat mengimpor cadangan di bawah tanpa proyek aktif.',
    importTitle: 'Impor cadangan',
    newWorkspace: 'ruang kerja baru',
    importDescription:
      'Impor memvalidasi manifes dan skema, memeriksa integritas lintas entitas, memigrasikan versi skema lama, dan memetakan ulang setiap ID. Selalu membuat proyek baru; data yang ada tidak pernah digabung atau ditimpa.',
    backupFile: 'File cadangan',
    readingButton: 'Membaca cadangan…',
    chooseBackup: 'Pilih file cadangan',
    readingNote: 'Membaca dan memvalidasi cadangan secara lokal. Tidak ada data yang meninggalkan browser ini.',
    importFailed: 'Impor gagal',
    acceptedPrefix: 'Diterima:',
    acceptedSuffix: 'atau JSON hingga 100 MB. Impor tidak menjalankan kode.',
    localStorageTitle: 'Penyimpanan lokal',
    localStorageBody: (millions: number) =>
      `MindMesh menyimpan satu catatan proyek lengkap per ruang kerja di IndexedDB. Teks hasil ekstraksi bisa besar; setiap dokumen dibatasi ${millions} juta karakter. Browser dapat menghapus data lokal saat penyimpanan penuh, jadi ekspor pekerjaan penting.`,
    idbBadge: 'IndexedDB · mindmesh',
    localFirst: 'lokal pertama',
    noAccount: 'tanpa akun',
    noServer: 'tanpa penyimpanan server',
    danger: 'Zona bahaya',
    deleteActive: 'Hapus ruang kerja aktif',
    deleteActiveBody: 'Menghapus proyek ini beserta dokumen, graf, kuis, dan riwayatnya.',
    deleteProject: 'Hapus proyek',
    clearAll: 'Hapus semua ruang kerja lokal',
    clearAllBody:
      'Menghapus setiap proyek di browser ini. Pengaturan AI dan kunci sesi disimpan terpisah dan tidak dihapus di sini.',
    clearEverything: 'Hapus semuanya',
    importDialogTitle: 'Impor proyek ini sebagai ruang kerja baru?',
    importDialogDescription: 'Tidak ada proyek Anda yang akan diubah.',
    cancel: 'Batal',
    importProject: 'Impor proyek',
    originalCreated: (date: string, schema: number) =>
      `Dibuat pertama ${date} · skema v${schema}`,
    sourceRefs: 'Referensi sumber',
    importWarnings: 'Peringatan impor',
    remapNote:
      'Semua ID entitas akan dipetakan ulang. Referensi bukti yang diimpor mempertahankan kutipan dan offset tersimpan; teks lengkap yang hilang dilaporkan di atas.',
    deleteTitle: (name: string) => `Hapus "${name}"?`,
    deleteDescription:
      'Tindakan ini menghapus proyek, dokumen dan teks hasil ekstraksi, graf, kuis, serta riwayat belajar dari browser ini. Ekspor cadangan terlebih dahulu jika mungkin diperlukan.',
    deleteWorkspace: 'Hapus ruang kerja',
    clearTitle: 'Hapus setiap ruang kerja lokal?',
    clearDescription:
      'Tindakan ini menghapus permanen semua proyek dari IndexedDB di browser ini. Pengaturan AI dan kunci sesi disimpan terpisah dan tidak dihapus. Tidak dapat dibatalkan tanpa cadangan.',
    clearConfirm: 'Hapus semua proyek',
    exportedTitle: 'Proyek diekspor',
    exportedBody: (size: string) =>
      `${size} ditulis secara lokal. Kunci penyedia dan pengaturan tidak pernah disertakan.`,
    exportError: 'Tidak dapat mengekspor proyek',
    tooLarge: (size: string) =>
      `File berukuran ${size}. File impor harus 100 MB atau lebih kecil.`,
    importedTitle: 'Proyek diimpor',
    importedBody: (name: string) =>
      `${name} dibuat sebagai ruang kerja baru. Proyek yang ada tidak diubah.`,
    workspaceDeleted: 'Ruang kerja dihapus',
    workspaceDeletedBody: 'Proyek lokal lain dipilih jika tersedia.',
    deleteError: 'Tidak dapat menghapus ruang kerja',
    clearedTitle: 'Ruang kerja lokal dihapus',
    clearedBody: 'Kunjungan berikutnya akan dimulai dengan ruang kerja kosong.',
    clearError: 'Tidak dapat menghapus data lokal',
    workspace: 'ruang kerja',
  },
} as const;

function projectCounts(project: KnowledgeProject) {
  return {
    documents: project.documents.length,
    concepts: project.concepts.length,
    relationships: project.relationships.length,
    quizzes: project.quizzes.length,
    attempts: project.attempts.length,
    records: project.learningRecords.length,
  };
}

export function DataPage() {
  const c = useCopy(copy);
  const navigate = useNavigate();
  const project = useWorkspaceStore((state) => state.activeProject);
  const projects = useWorkspaceStore((state) => state.projects);
  const importProject = useWorkspaceStore((state) => state.importProject);
  const deleteProject = useWorkspaceStore((state) => state.deleteProject);
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace);
  const inputRef = useRef<HTMLInputElement>(null);
  const [includeText, setIncludeText] = useState(true);
  const [includeLearning, setIncludeLearning] = useState(true);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importRaw, setImportRaw] = useState<unknown>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleExport = () => {
    if (!project) return;
    try {
      const payload = buildProjectExport(project, {
        includeExtractedText: includeText,
        includeLearningData: includeLearning,
      });
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = exportFilename(project);
      anchor.hidden = true;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success(c.exportedTitle, c.exportedBody(formatBytes(blob.size)));
    } catch (error) {
      toast.error(c.exportError, errorMessage(error));
    }
  };

  const readFile = async (file: File) => {
    setImportError(null);
    setImportPreview(null);
    setImportRaw(null);
    if (file.size > MAX_IMPORT_BYTES) {
      setImportError(c.tooLarge(formatBytes(file.size)));
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setReading(true);
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      const preview = prepareProjectImport(raw);
      setImportRaw(raw);
      setImportPreview(preview);
    } catch (error) {
      setImportError(errorMessage(error));
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const commitImport = async () => {
    if (importRaw === null) return;
    setImporting(true);
    try {
      const imported = await importProject(importRaw);
      toast.success(c.importedTitle, c.importedBody(imported.name));
      setImportPreview(null);
      setImportRaw(null);
      navigate('/');
    } catch (error) {
      setImportError(errorMessage(error));
    } finally {
      setImporting(false);
    }
  };

  const counts = project ? projectCounts(project) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={c.eyebrow}
        title={c.title}
        description={c.description}
        orb="data"
        actions={<Badge variant="outline">{c.projectBadge(projects.length)}</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-cyan-300" /> {c.exportTitle}
            </CardTitle>
            {project ? <Badge variant="cyan">{c.ready}</Badge> : <Badge variant="outline">{c.noProject}</Badge>}
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {project ? (
              <>
                <div>
                  <p className="text-sm font-medium text-bright">{project.name}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {c.updated(formatDate(project.updatedAt, true), project.schemaVersion)}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  {[
                    [c.documents, counts?.documents],
                    [c.concepts, counts?.concepts],
                    [c.relationships, counts?.relationships],
                    [c.quizzes, counts?.quizzes],
                    [c.attempts, counts?.attempts],
                    [c.learningRecords, counts?.records],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2">
                      <p className="text-base font-semibold text-bright">{value}</p>
                      <p className="mt-0.5 text-slate-600">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Checkbox
                    checked={includeText}
                    onChange={(event) => setIncludeText(event.target.checked)}
                    label={c.includeText}
                    description={c.includeTextDescription}
                  />
                  <Checkbox
                    checked={includeLearning}
                    onChange={(event) => setIncludeLearning(event.target.checked)}
                    label={c.includeLearning}
                    description={c.includeLearningDescription}
                  />
                </div>
                <Button
                  variant="primary"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={handleExport}
                >
                  {c.download}
                </Button>
                <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-600">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                  {c.exportNote}
                </p>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-slate-500">
                {c.openWorkspace}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-violet-300" /> {c.importTitle}
            </CardTitle>
            <Badge variant="outline">{c.newWorkspace}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <p className="text-xs leading-relaxed text-slate-500">
              {c.importDescription}
            </p>
            <label htmlFor="backup-file" className="sr-only">
              {c.backupFile}
            </label>
            <input
              id="backup-file"
              ref={inputRef}
              type="file"
              accept=".json,.mindmesh.json,application/json"
              className="sr-only"
              disabled={reading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
            <Button
              variant="secondary"
              leftIcon={<FileJson className="h-4 w-4" />}
              loading={reading}
              onClick={() => inputRef.current?.click()}
            >
              {reading ? c.readingButton : c.chooseBackup}
            </Button>
            {reading ? (
              <p role="status" className="text-[10px] text-slate-500">
                {c.readingNote}
              </p>
            ) : null}
            {importError ? (
              <Notice tone="error" title={c.importFailed}>
                {importError}
              </Notice>
            ) : null}
            <p className="text-[10px] text-slate-600">
              {c.acceptedPrefix} <span className="font-mono text-slate-500">.mindmesh.json</span> {c.acceptedSuffix}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4 text-slate-400" /> {c.localStorageTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          <p className="text-xs leading-relaxed text-slate-500">
            {c.localStorageBody(Math.round(MAX_EXTRACTED_TEXT_CHARS / 1_000_000))}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{c.idbBadge}</Badge>
            <Badge variant="outline">{c.localFirst}</Badge>
            <Badge variant="outline">{c.noAccount}</Badge>
            <Badge variant="outline">{c.noServer}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-rose-400/15">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-100">
            <AlertTriangle className="h-4 w-4 text-rose-300" /> {c.danger}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-soft bg-white/[0.015] p-3">
            <div>
              <p className="text-xs font-medium text-slate-200">{c.deleteActive}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {c.deleteActiveBody}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              disabled={!project}
              onClick={() => setConfirmDeleteProject(true)}
            >
              {c.deleteProject}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-500/[0.025] p-3">
            <div>
              <p className="text-xs font-medium text-rose-100">{c.clearAll}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {c.clearAllBody}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => setConfirmReset(true)}
            >
              {c.clearEverything}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(importPreview)}
        onClose={() => {
          if (!importing) {
            setImportPreview(null);
            setImportRaw(null);
          }
        }}
        title={c.importDialogTitle}
        description={c.importDialogDescription}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setImportPreview(null);
                setImportRaw(null);
              }}
              disabled={importing}
            >
              {c.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={commitImport}
              loading={importing}
              leftIcon={<Archive className="h-4 w-4" />}
            >
              {c.importProject}
            </Button>
          </>
        }
      >
        {importPreview ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-bright">{importPreview.project.name}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {c.originalCreated(
                  formatDate(importPreview.project.createdAt, true),
                  importPreview.project.schemaVersion,
                )}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              {[
                [c.documents, importPreview.project.documents.length],
                [c.concepts, importPreview.project.concepts.length],
                [c.relationships, importPreview.project.relationships.length],
                [c.quizzes, importPreview.project.quizzes.length],
                [c.attempts, importPreview.project.attempts.length],
                [
                  c.sourceRefs,
                  importPreview.project.concepts.reduce(
                    (sum, concept) => sum + concept.sourceReferences.length,
                    0,
                  ),
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2">
                  <p className="text-base font-semibold text-bright">{value}</p>
                  <p className="mt-0.5 text-slate-600">{label}</p>
                </div>
              ))}
            </div>
            {importPreview.warnings.length > 0 ? (
              <Notice tone="warning" title={c.importWarnings}>
                <ul className="space-y-1">
                  {importPreview.warnings.map((warning) => (
                    <li key={warning}>· {warning}</li>
                  ))}
                </ul>
              </Notice>
            ) : null}
            {importError ? (
              <Notice tone="error" title={c.importFailed}>
                {importError}
              </Notice>
            ) : null}
            <p className="text-[10px] leading-relaxed text-slate-600">
              {c.remapNote}
            </p>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteProject}
        onClose={() => setConfirmDeleteProject(false)}
        onConfirm={async () => {
          if (!project) return;
          setDeletingProject(true);
          try {
            await deleteProject(project.projectId);
            toast.success(c.workspaceDeleted, c.workspaceDeletedBody);
            setConfirmDeleteProject(false);
            navigate('/');
          } catch (error) {
            toast.error(c.deleteError, errorMessage(error));
          } finally {
            setDeletingProject(false);
          }
        }}
        title={c.deleteTitle(project?.name ?? c.workspace)}
        description={c.deleteDescription}
        confirmLabel={c.deleteWorkspace}
        destructive
        loading={deletingProject}
      />

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={async () => {
          setResetting(true);
          try {
            await resetWorkspace();
            toast.success(c.clearedTitle, c.clearedBody);
            setConfirmReset(false);
            navigate('/');
          } catch (error) {
            toast.error(c.clearError, errorMessage(error));
          } finally {
            setResetting(false);
          }
        }}
        title={c.clearTitle}
        description={c.clearDescription}
        confirmLabel={c.clearConfirm}
        destructive
        loading={resetting}
      />
    </div>
  );
}

