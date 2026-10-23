import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  Clock,
  FileText,
  GitBranch,
  GraduationCap,
  Plus,
  Sparkles,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { toast } from '@/app/toast-store';
import { useCopy, type Widen } from '@/app/language-store';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input } from '@/components/ui/form';
import { EmptyState, Notice, ProgressBar, Skeleton } from '@/components/ui/states';
import { ImportPanel } from '@/features/documents/import-panel';
import { OnboardingOverview } from '@/features/onboarding/onboarding-overview';
import { SampleProjectButton } from '@/features/onboarding/sample-button';
import { FeatureOrb } from '@/features/world/feature-orb';
import { computeGraphStats, getDirectRelationships } from '@/services/graph-engine/graph';
import { buildWorkspaceOrbit } from '@/services/graph-engine/orbit';
import { formatDate, formatRelative, errorMessage } from '@/lib/utils';
import type { KnowledgeProject, MasteryState, ReviewStatus } from '@/core/domain/types';

const KnowledgeOrbit = lazy(() => import('@/features/world/knowledge-orbit'));

const copy = {
  en: {
    workspace: 'Workspace',
    createSpaceTitle: 'Create your knowledge space',
    createSpaceDescription:
      'A project holds documents, concepts, relationships, quizzes, and learning history. Everything is stored locally in this browser.',
    defaultProjectName: 'My Knowledge',
    workspaceCreated: 'Workspace created',
    workspaceCreatedBody: 'Import a document to begin building your graph.',
    createWorkspaceError: 'Could not create the workspace',
    projectName: 'Project name',
    createWorkspace: 'Create workspace',
    extraProjectsNotice:
      'You can create additional projects later. Exports are JSON files and never include API keys or bridge tokens.',
    localFirstAiOptional: 'Local-first · AI optional',
    heroLead: 'Turn what you read into ',
    heroHighlight: 'what you understand.',
    heroDescription:
      'Start with one PDF or Markdown file. MindMesh extracts page and section evidence, then lets you shape an explorable knowledge graph without sending your document anywhere.',
    importDocument: 'Import a document',
    projectLabel: 'Project:',
    howItWorks: 'How MindMesh works',
    featureEvidenceTitle: 'Page-level evidence',
    featureEvidenceBody:
      'PDF references use actual one-based page numbers. Markdown references keep heading hierarchy and offsets.',
    featureGraphTitle: 'Graph without AI',
    featureGraphBody:
      'Create concepts manually or from headings. AI can suggest relationships later, but it is never required for the core workflow.',
    featureLearningTitle: 'Learning that remembers',
    featureLearningBody:
      'Quizzes and review dates persist in IndexedDB. Mastery requires repeated correct answers, not a single click.',
    dashboard: 'Dashboard',
    dashboardDescription:
      'A live view of your local knowledge project. Every number is computed from stored documents, concepts, relationships, and learning records.',
    documents: 'Documents',
    openUniverse: 'Open universe',
    documentsWithWarnings: (count: number) => `${count} with extraction warnings`,
    noSources: 'No sources imported yet',
    concepts: 'Concepts',
    conceptDetail: (isolated: number, averageDegree: string) =>
      `${isolated} isolated · ${averageDegree} avg. degree`,
    relationships: 'Relationships',
    relationTypes: (count: number) => `${count} relation types in use`,
    reviewedConcepts: 'Reviewed concepts',
    reviewedDetail: (mastered: number, attempts: number) =>
      `${mastered} mastered · ${attempts} quiz attempts`,
    suggestedNextStep: 'Suggested next step',
    nextExtractTitle: 'Extract your first concepts',
    nextExtractBody: (filename: string) =>
      `Open ${filename}, choose a section, and create an evidence-backed concept.`,
    openDocument: 'Open document',
    nextConnectTitle: 'Connect what you know',
    nextConnectBody:
      'Add a prerequisite, contrast, or example relationship in the universe inspector.',
    nextTestTitle: 'Test your understanding',
    nextTestBody:
      'Create a rule-based practice set from approved concepts and inspect the evidence behind each answer.',
    buildQuiz: 'Build a quiz',
    nextLoopTitle: 'Start your first learning loop',
    nextLoopBody:
      'Complete a quiz. Attempts and mastery dates are stored only in this browser.',
    startPracticing: 'Start practicing',
    nextReviewTitle: 'Review untouched concepts',
    nextReviewBody: (count: number) =>
      `${count} concept${count === 1 ? '' : 's'} have no learning record yet.`,
    viewProgress: 'View progress',
    nextExploreTitle: 'Explore your knowledge space',
    nextExploreBody:
      'Select a concept, follow its neighborhood, and open the original source beside it.',
    exploreUniverse: 'Explore universe',
    recentDocuments: 'Recent documents',
    viewAll: 'View all',
    noDocumentsYet: 'No documents yet',
    noDocumentsDescription: 'Import a PDF or Markdown file to create provenance-backed concepts.',
    pages: (count: string) => `${count} pages`,
    sections: (count: number) => `${count} sections`,
    conceptsCount: (count: number) => `${count} concepts`,
    warning: 'warning',
    ready: 'ready',
    recentConcepts: 'Recent concepts',
    browseAll: 'Browse all',
    conceptsAppear: 'Concepts will appear here after you create or accept them.',
    noDescription: 'No description',
    links: (count: number) => `${count} link${count === 1 ? '' : 's'}`,
    reviewStatusSuggested: 'suggested',
    reviewStatusConfirmed: 'confirmed',
    reviewStatusRejected: 'rejected',
    knowledgePulse: 'Knowledge pulse',
    knowledgePulseSubtitle: 'Your most connected concepts, in motion',
    learningProgress: 'Learning progress',
    details: 'Details',
    masteryMastered: 'Mastered',
    masteryFamiliar: 'Familiar',
    masteryLearning: 'Learning',
    masteryNew: 'Not started',
    masteryEmpty: 'Mastery appears after concepts exist and quizzes are completed.',
    overallMastery: 'Overall mastery',
    reviewQueue: 'Review queue',
    dueCount: (count: number) => `${count} due`,
    noScheduledReviews: 'No scheduled reviews are due right now.',
    noReviewSchedule: 'Complete a quiz to start scheduling reviews.',
    due: 'due',
    recentActivity: 'Recent activity',
    noActivity: 'No activity yet.',
    importedAt: (date: string) => `Imported ${date}`,
    topics: 'Topics',
    yourData: 'Your data',
    dataStoredPrefix: 'Stored in this browser. Export a project from',
    dataBackups: 'Data & backups',
    dataStoredMiddle: 'before clearing browser storage.',
    documentsInProject: (count: number) =>
      `${count} document${count === 1 ? '' : 's'} in this project.`,
    latest: (filename: string) => ` Latest: ${filename}.`,
  },
  id: {
    workspace: 'Ruang kerja',
    createSpaceTitle: 'Buat ruang pengetahuan Anda',
    createSpaceDescription:
      'Proyek menyimpan dokumen, konsep, relasi, kuis, dan riwayat pembelajaran. Semua disimpan secara lokal di browser ini.',
    defaultProjectName: 'Pengetahuan Saya',
    workspaceCreated: 'Ruang kerja dibuat',
    workspaceCreatedBody: 'Impor dokumen untuk mulai membangun graf Anda.',
    createWorkspaceError: 'Tidak dapat membuat ruang kerja',
    projectName: 'Nama proyek',
    createWorkspace: 'Buat ruang kerja',
    extraProjectsNotice:
      'Anda dapat membuat proyek tambahan nanti. Ekspor berupa file JSON dan tidak pernah menyertakan kunci API atau token bridge.',
    localFirstAiOptional: 'Berbasis lokal · AI opsional',
    heroLead: 'Ubah yang Anda baca menjadi ',
    heroHighlight: 'yang Anda pahami.',
    heroDescription:
      'Mulai dengan satu file PDF atau Markdown. MindMesh mengekstrak bukti halaman dan bagian, lalu membiarkan Anda membentuk graf pengetahuan yang dapat dijelajahi tanpa mengirim dokumen Anda ke mana pun.',
    importDocument: 'Impor dokumen',
    projectLabel: 'Proyek:',
    howItWorks: 'Cara kerja MindMesh',
    featureEvidenceTitle: 'Bukti tingkat halaman',
    featureEvidenceBody:
      'Referensi PDF menggunakan nomor halaman asli berbasis satu. Referensi Markdown mempertahankan hierarki judul dan offset.',
    featureGraphTitle: 'Graf tanpa AI',
    featureGraphBody:
      'Buat konsep secara manual atau dari judul. AI dapat menyarankan relasi nanti, tetapi tidak pernah diperlukan untuk alur kerja inti.',
    featureLearningTitle: 'Pembelajaran yang mengingat',
    featureLearningBody:
      'Kuis dan tanggal ulangan tersimpan di IndexedDB. Penguasaan membutuhkan jawaban benar berulang, bukan satu klik.',
    dashboard: 'Dasbor',
    dashboardDescription:
      'Tampilan langsung proyek pengetahuan lokal Anda. Setiap angka dihitung dari dokumen, konsep, relasi, dan catatan pembelajaran yang tersimpan.',
    documents: 'Dokumen',
    openUniverse: 'Buka semesta',
    documentsWithWarnings: (count: number) => `${count} dengan peringatan ekstraksi`,
    noSources: 'Belum ada sumber yang diimpor',
    concepts: 'Konsep',
    conceptDetail: (isolated: number, averageDegree: string) =>
      `${isolated} terisolasi · derajat rata-rata ${averageDegree}`,
    relationships: 'Relasi',
    relationTypes: (count: number) => `${count} jenis relasi digunakan`,
    reviewedConcepts: 'Konsep ditinjau',
    reviewedDetail: (mastered: number, attempts: number) =>
      `${mastered} dikuasai · ${attempts} percobaan kuis`,
    suggestedNextStep: 'Langkah berikutnya yang disarankan',
    nextExtractTitle: 'Ekstrak konsep pertama Anda',
    nextExtractBody: (filename: string) =>
      `Buka ${filename}, pilih bagian, dan buat konsep berbasis bukti.`,
    openDocument: 'Buka dokumen',
    nextConnectTitle: 'Hubungkan yang Anda ketahui',
    nextConnectBody: 'Tambahkan relasi prasyarat, kontras, atau contoh di inspektur semesta.',
    nextTestTitle: 'Uji pemahaman Anda',
    nextTestBody:
      'Buat set latihan berbasis aturan dari konsep yang disetujui dan periksa bukti di balik setiap jawaban.',
    buildQuiz: 'Buat kuis',
    nextLoopTitle: 'Mulai putaran belajar pertama Anda',
    nextLoopBody: 'Selesaikan kuis. Percobaan dan tanggal penguasaan hanya disimpan di browser ini.',
    startPracticing: 'Mulai berlatih',
    nextReviewTitle: 'Tinjau konsep yang belum tersentuh',
    nextReviewBody: (count: number) =>
      `${count} konsep belum memiliki catatan pembelajaran.`,
    viewProgress: 'Lihat kemajuan',
    nextExploreTitle: 'Jelajahi ruang pengetahuan Anda',
    nextExploreBody: 'Pilih konsep, ikuti lingkungannya, dan buka sumber asli di sampingnya.',
    exploreUniverse: 'Jelajahi semesta',
    recentDocuments: 'Dokumen terbaru',
    viewAll: 'Lihat semua',
    noDocumentsYet: 'Belum ada dokumen',
    noDocumentsDescription: 'Impor file PDF atau Markdown untuk membuat konsep berbasis provenans.',
    pages: (count: string) => `${count} halaman`,
    sections: (count: number) => `${count} bagian`,
    conceptsCount: (count: number) => `${count} konsep`,
    warning: 'peringatan',
    ready: 'siap',
    recentConcepts: 'Konsep terbaru',
    browseAll: 'Jelajahi semua',
    conceptsAppear: 'Konsep akan muncul di sini setelah Anda membuat atau menyetujuinya.',
    noDescription: 'Tanpa deskripsi',
    links: (count: number) => `${count} tautan`,
    reviewStatusSuggested: 'disarankan',
    reviewStatusConfirmed: 'terkonfirmasi',
    reviewStatusRejected: 'ditolak',
    knowledgePulse: 'Denyut pengetahuan',
    knowledgePulseSubtitle: 'Konsep Anda yang paling terhubung, dalam gerakan',
    learningProgress: 'Kemajuan belajar',
    details: 'Detail',
    masteryMastered: 'Dikuasai',
    masteryFamiliar: 'Familiar',
    masteryLearning: 'Belajar',
    masteryNew: 'Belum dimulai',
    masteryEmpty: 'Penguasaan muncul setelah konsep ada dan kuis diselesaikan.',
    overallMastery: 'Penguasaan keseluruhan',
    reviewQueue: 'Antrean ulangan',
    dueCount: (count: number) => `${count} jatuh tempo`,
    noScheduledReviews: 'Tidak ada ulangan terjadwal yang jatuh tempo saat ini.',
    noReviewSchedule: 'Selesaikan kuis untuk mulai menjadwalkan ulangan.',
    due: 'jatuh tempo',
    recentActivity: 'Aktivitas terbaru',
    noActivity: 'Belum ada aktivitas.',
    importedAt: (date: string) => `Diimpor ${date}`,
    topics: 'Topik',
    yourData: 'Data Anda',
    dataStoredPrefix: 'Tersimpan di browser ini. Ekspor proyek dari',
    dataBackups: 'Data & cadangan',
    dataStoredMiddle: 'sebelum menghapus penyimpanan browser.',
    documentsInProject: (count: number) => `${count} dokumen dalam proyek ini.`,
    latest: (filename: string) => ` Terbaru: ${filename}.`,
  },
} as const;

type CopyShape = Widen<(typeof copy)[keyof typeof copy]>;

const masteryOrder: MasteryState[] = ['mastered', 'familiar', 'learning', 'new'];
const masteryColors: Record<MasteryState, string> = {
  mastered: 'bg-emerald-400',
  familiar: 'bg-cyan-400',
  learning: 'bg-violet-400',
  new: 'bg-slate-600',
};

function masteryLabels(c: CopyShape): Record<MasteryState, string> {
  return {
    mastered: c.masteryMastered,
    familiar: c.masteryFamiliar,
    learning: c.masteryLearning,
    new: c.masteryNew,
  };
}

function reviewStatusLabel(status: ReviewStatus, c: CopyShape): string {
  if (status === 'suggested') return c.reviewStatusSuggested;
  if (status === 'rejected') return c.reviewStatusRejected;
  return c.reviewStatusConfirmed;
}

function NoProjectState() {
  const c = useCopy(copy);
  const [name, setName] = useState<string>(c.defaultProjectName);
  const [busy, setBusy] = useState(false);
  const createProject = useWorkspaceStore((state) => state.createProject);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={c.workspace}
        title={c.createSpaceTitle}
        description={c.createSpaceDescription}
        orb="knowledge"
      />
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/[0.07] text-violet-200">
            <Boxes className="h-5 w-5" aria-hidden="true" />
          </div>
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              try {
                await createProject(name);
                toast.success(c.workspaceCreated, c.workspaceCreatedBody);
              } catch (error) {
                toast.error(c.createWorkspaceError, errorMessage(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label={c.projectName} htmlFor="new-project-name">
              <Input
                id="new-project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                autoFocus
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" loading={busy} leftIcon={<Plus className="h-4 w-4" />}>
                {c.createWorkspace}
              </Button>
              <SampleProjectButton />
            </div>
          </form>
          <Notice tone="info">{c.extraProjectsNotice}</Notice>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyDashboard({ project }: { project: KnowledgeProject }) {
  const c = useCopy(copy);
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-[linear-gradient(135deg,rgba(126,186,163,0.055),rgba(138,162,184,0.025)_45%,rgba(12,14,17,0.94))] p-6 sm:p-8 lg:p-10">
        <div className="grid-fade pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-18 -top-24 h-72 w-72 rounded-full bg-cyan-400/[0.07] blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-200">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {c.localFirstAiOptional}
            </div>
            <h1 className="max-w-xl text-3xl font-semibold leading-[1.1] tracking-[-0.04em] text-bright sm:text-4xl">
              {c.heroLead}
              <span className="gradient-text">{c.heroHighlight}</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-mist">{c.heroDescription}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                leftIcon={<FileText className="h-4 w-4" />}
                onClick={() => document.getElementById('dashboard-import')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              >
                {c.importDocument}
              </Button>
              <SampleProjectButton />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <FeatureOrb variant="knowledge" size={58} />
              <p className="text-[11px] text-slate-500">
                {c.projectLabel} <span className="text-slate-300">{project.name}</span>
              </p>
            </div>
          </div>
          <div id="dashboard-import" className="glass rounded-2xl p-4 sm:p-5">
            <ImportPanel compact />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-bright">{c.howItWorks}</h2>
        <OnboardingOverview />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <FileText className="mb-3 h-4 w-4 text-cyan-300" aria-hidden="true" />
            <p className="text-xs font-semibold text-bright">{c.featureEvidenceTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{c.featureEvidenceBody}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <BrainCircuit className="mb-3 h-4 w-4 text-violet-300" aria-hidden="true" />
            <p className="text-xs font-semibold text-bright">{c.featureGraphTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{c.featureGraphBody}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Target className="mb-3 h-4 w-4 text-emerald-300" aria-hidden="true" />
            <p className="text-xs font-semibold text-bright">{c.featureLearningTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{c.featureLearningBody}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group surface rounded-xl p-4 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-slate-500/60 hover:shadow-[0_18px_44px_rgba(0,0,0,0.28)] motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-center justify-between">
        <span className="text-slate-500">{icon}</span>
        <ArrowRight className="h-3.5 w-3.5 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-bright">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1.5 text-[11px] text-slate-500">{detail}</p>
    </Link>
  );
}

function DashboardContent({ project }: { project: KnowledgeProject }) {
  const c = useCopy(copy);
  const navigate = useNavigate();
  const stats = useMemo(() => computeGraphStats(project), [project]);
  const masteryCounts = useMemo(() => {
    const records = new Map(project.learningRecords.map((record) => [record.conceptId, record]));
    const counts: Record<MasteryState, number> = { new: 0, learning: 0, familiar: 0, mastered: 0 };
    for (const concept of project.concepts) {
      const state = records.get(concept.id)?.masteryState ?? 'new';
      counts[state] += 1;
    }
    return counts;
  }, [project]);

  const orbitNodes = useMemo(() => buildWorkspaceOrbit(project), [project]);

  const latestDocument = [...project.documents].sort((a, b) =>
    b.importedAt.localeCompare(a.importedAt),
  )[0];
  const reviewed = project.learningRecords.length;
  const mastered = masteryCounts.mastered;

  const nextAction = (() => {
    if (project.concepts.length === 0 && latestDocument) {
      return {
        title: c.nextExtractTitle,
        body: c.nextExtractBody(latestDocument.filename),
        href: `/documents/${latestDocument.id}`,
        cta: c.openDocument,
        icon: FileText,
      };
    }
    if (project.concepts.length >= 2 && project.relationships.length === 0) {
      return {
        title: c.nextConnectTitle,
        body: c.nextConnectBody,
        href: '/universe',
        cta: c.openUniverse,
        icon: GitBranch,
      };
    }
    if (project.concepts.length >= 2 && project.quizzes.length === 0) {
      return {
        title: c.nextTestTitle,
        body: c.nextTestBody,
        href: '/learning',
        cta: c.buildQuiz,
        icon: GraduationCap,
      };
    }
    if (project.quizzes.length > 0 && project.attempts.length === 0) {
      return {
        title: c.nextLoopTitle,
        body: c.nextLoopBody,
        href: '/learning',
        cta: c.startPracticing,
        icon: Target,
      };
    }
    if (reviewed > 0 && reviewed < project.concepts.length) {
      return {
        title: c.nextReviewTitle,
        body: c.nextReviewBody(project.concepts.length - reviewed),
        href: '/learning/progress',
        cta: c.viewProgress,
        icon: Clock,
      };
    }
    return {
      title: c.nextExploreTitle,
      body: c.nextExploreBody,
      href: '/universe',
      cta: c.exploreUniverse,
      icon: Boxes,
    };
  })();
  const NextIcon = nextAction.icon;
  const labels = masteryLabels(c);

  const recentDocuments = [...project.documents]
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt))
    .slice(0, 4);
  const recentConcepts = [...project.concepts]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const recentAttempts = [...project.attempts]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 3);
  const due = project.learningRecords
    .filter((record) => record.nextReviewAt && new Date(record.nextReviewAt) <= new Date())
    .sort((a, b) => (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? ''))
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow={c.dashboard}
        title={project.name}
        description={c.dashboardDescription}
        orb="knowledge"
        actions={
          <>
            <Button variant="secondary" leftIcon={<FileText className="h-4 w-4" />} onClick={() => navigate('/documents')}>
              {c.documents}
            </Button>
            <Button variant="primary" leftIcon={<Boxes className="h-4 w-4" />} onClick={() => navigate('/universe')}>
              {c.openUniverse}
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label={c.documents}
          value={project.documents.length}
          detail={
            project.documents.length
              ? c.documentsWithWarnings(
                  project.documents.filter((document) => document.processingStatus === 'warning').length,
                )
              : c.noSources
          }
          href="/documents"
        />
        <StatCard
          icon={<BrainCircuit className="h-4 w-4" />}
          label={c.concepts}
          value={stats.conceptCount}
          detail={c.conceptDetail(stats.isolatedConcepts, stats.averageDegree.toFixed(1))}
          href="/universe?view=list"
        />
        <StatCard
          icon={<GitBranch className="h-4 w-4" />}
          label={c.relationships}
          value={stats.relationshipCount}
          detail={c.relationTypes(
            Object.values(stats.relationTypeCounts).filter((count) => count > 0).length,
          )}
          href="/universe"
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label={c.reviewedConcepts}
          value={`${reviewed}/${project.concepts.length}`}
          detail={c.reviewedDetail(mastered, project.attempts.length)}
          href="/learning/progress"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="min-w-0 space-y-5">
          <Card className="border-cyan-400/15 bg-[linear-gradient(130deg,rgba(126,186,163,0.055),rgba(17,19,25,0.92))]">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-200">
                <NextIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/80">
                  {c.suggestedNextStep}
                </p>
                <h2 className="mt-1 text-sm font-semibold text-bright">{nextAction.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-mist">{nextAction.body}</p>
              </div>
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => navigate(nextAction.href)}>
                {nextAction.cta}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{c.recentDocuments}</CardTitle>
              <Link to="/documents" className="text-xs text-cyan-300 hover:text-cyan-200">
                {c.viewAll}
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentDocuments.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={<FileText className="h-5 w-5" />}
                    title={c.noDocumentsYet}
                    description={c.noDocumentsDescription}
                    action={<SampleProjectButton size="sm" />}
                  />
                </div>
              ) : (
                <ul className="divide-y divide-line-soft">
                  {recentDocuments.map((document) => {
                    const conceptCount = project.concepts.filter((concept) =>
                      concept.sourceReferences.some((reference) => reference.documentId === document.id),
                    ).length;
                    return (
                      <li key={document.id}>
                        <Link
                          to={`/documents/${document.id}`}
                          className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.025]"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-[#0e1014] text-slate-400">
                            <FileText className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-200">{document.filename}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {document.mediaType === 'application/pdf'
                                ? c.pages(String(document.pageCount ?? '?'))
                                : c.sections(document.sections.length)} · {c.conceptsCount(conceptCount)} · {formatRelative(document.importedAt)}
                            </p>
                          </div>
                          {document.processingStatus === 'warning' ? (
                            <Badge variant="amber">
                              <TriangleAlert className="h-2.5 w-2.5" />
                              {c.warning}
                            </Badge>
                          ) : (
                            <Badge variant="emerald">{c.ready}</Badge>
                          )}
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{c.recentConcepts}</CardTitle>
              <Link to="/universe?view=list" className="text-xs text-cyan-300 hover:text-cyan-200">
                {c.browseAll}
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentConcepts.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">
                  {c.conceptsAppear}
                </p>
              ) : (
                <ul className="divide-y divide-line-soft">
                  {recentConcepts.map((concept) => {
                    const degree = getDirectRelationships(project, concept.id).length;
                    return (
                      <li key={concept.id}>
                        <Link
                          to={`/concepts/${concept.id}`}
                          className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.025]"
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full bg-violet-300" aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-slate-200">{concept.label}</p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {concept.description || concept.sourceReferences[0]?.excerpt || c.noDescription}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] text-slate-500">
                            {c.links(degree)}
                          </span>
                          <Badge variant={concept.reviewStatus === 'confirmed' ? 'cyan' : 'amber'}>
                            {reviewStatusLabel(concept.reviewStatus, c)}
                          </Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          {orbitNodes.length > 0 ? (
            <Card className="overflow-hidden border-cyan-400/15">
              <CardHeader>
                <div>
                  <CardTitle>{c.knowledgePulse}</CardTitle>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {c.knowledgePulseSubtitle}
                  </p>
                </div>
                <Badge variant="cyan">3D</Badge>
              </CardHeader>
              <Suspense
                fallback={
                  <div className="p-3">
                    <Skeleton className="h-[210px] w-full rounded-xl" />
                  </div>
                }
              >
                <KnowledgeOrbit
                  focusLabel={project.name}
                  nodes={orbitNodes}
                  height={210}
                  onSelect={(id) => navigate(`/concepts/${id}`)}
                />
              </Suspense>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{c.learningProgress}</CardTitle>
              <Link to="/learning/progress" className="text-xs text-cyan-300 hover:text-cyan-200">
                {c.details}
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {masteryOrder.map((state) => {
                const count = masteryCounts[state];
                const total = Math.max(1, project.concepts.length);
                return (
                  <div key={state}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{labels[state]}</span>
                      <span className="font-mono text-slate-500">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className={`h-full rounded-full ${masteryColors[state]}`}
                        style={{ width: `${(count / total) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {project.concepts.length === 0 ? (
                <p className="text-xs leading-relaxed text-slate-500">
                  {c.masteryEmpty}
                </p>
              ) : (
                <div className="border-t border-line-soft pt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{c.overallMastery}</span>
                    <span>{Math.round((mastered / Math.max(1, project.concepts.length)) * 100)}%</span>
                  </div>
                  <ProgressBar
                    value={mastered}
                    max={Math.max(1, project.concepts.length)}
                    className="mt-2"
                    label={c.overallMastery}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{c.reviewQueue}</CardTitle>
              <Badge variant={due.length ? 'amber' : 'default'}>{c.dueCount(due.length)}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {due.length === 0 ? (
                <p className="px-5 py-5 text-xs leading-relaxed text-slate-500">
                  {project.learningRecords.length
                    ? c.noScheduledReviews
                    : c.noReviewSchedule}
                </p>
              ) : (
                <ul className="divide-y divide-line-soft">
                  {due.map((record) => {
                    const concept = project.concepts.find((candidate) => candidate.id === record.conceptId);
                    if (!concept) return null;
                    return (
                      <li key={record.conceptId}>
                        <Link
                          to={`/concepts/${concept.id}`}
                          className="flex items-center justify-between gap-3 px-5 py-3 text-xs hover:bg-white/[0.025]"
                        >
                          <span className="truncate text-slate-300">{concept.label}</span>
                          <span className="shrink-0 text-[10px] text-amber-300">{c.due}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{c.recentActivity}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAttempts.length === 0 && recentDocuments.length === 0 ? (
                <p className="text-xs text-slate-500">{c.noActivity}</p>
              ) : (
                <>
                  {recentAttempts.map((attempt) => (
                    <div key={attempt.id} className="flex items-start gap-2.5 text-xs">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-slate-300">{attempt.quizTitle}</p>
                        <p className="text-[10px] text-slate-500">
                          {attempt.score}/{attempt.total} · {formatRelative(attempt.completedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentDocuments.slice(0, 2).map((document) => (
                    <div key={document.id} className="flex items-start gap-2.5 text-xs">
                      <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-slate-300">{document.filename}</p>
                        <p className="text-[10px] text-slate-500">{c.importedAt(formatDate(document.importedAt))}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {stats.tagCounts && Object.keys(stats.tagCounts).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{c.topics}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {Object.entries(stats.tagCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([tag, count]) => (
                    <Link key={tag} to={`/universe?tag=${encodeURIComponent(tag)}&view=list`}>
                      <Badge variant="outline" className="normal-case tracking-normal">
                        {tag} <span className="text-slate-500">{count}</span>
                      </Badge>
                    </Link>
                  ))}
              </CardContent>
            </Card>
          ) : null}

          <Notice tone="info" title={c.yourData}>
            {c.dataStoredPrefix}{' '}
            <Link to="/data" className="underline">
              {c.dataBackups}
            </Link>{' '}
            {c.dataStoredMiddle} {c.documentsInProject(project.documents.length)}
            {latestDocument ? c.latest(latestDocument.filename) : ''}
          </Notice>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const project = useWorkspaceStore((state) => state.activeProject);
  const loading = useWorkspaceStore((state) => state.loading);
  if (!project) {
    return loading ? null : <NoProjectState />;
  }
  if (project.documents.length === 0) {
    return <EmptyDashboard project={project} />;
  }
  return <DashboardContent project={project} />;
}
