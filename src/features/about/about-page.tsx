import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Brain,
  CheckCircle2,
  FileText,
  GitBranch,
  Layers,
  Lock,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { buttonClassName } from '@/components/ui/button-styles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCopy } from '@/app/language-store';

const copy = {
  en: {
    eyebrow: 'About MindMesh',
    title: 'A knowledge space you can inspect',
    description:
      'MindMesh is a local-first study environment for turning source material into a connected, evidence-backed graph.',
    whyExists: 'Why it exists',
    whyBody:
      'Most study tools separate reading, notes, diagrams, and quizzes into disconnected silos. MindMesh keeps the source, the concept, the relationship, and the practice record in one local project. The graph is not decoration: it is a navigation layer over evidence.',
    principles: [
      {
        title: 'Local-first by default',
        body: 'Projects live in IndexedDB in your browser. There is no account, cloud workspace, telemetry, or hidden sync.',
      },
      {
        title: 'Evidence before confidence',
        body: 'Concepts and relationships can point to page numbers, heading sections, character offsets, and exact excerpts.',
      },
      {
        title: 'AI is optional and reviewed',
        body: 'Bring your own provider. Document text is sent only after explicit consent, suggestions require verified quotations, and nothing is added automatically.',
      },
      {
        title: 'No fake mechanics',
        body: 'Quiz generation, grading, scheduling, and mastery use transparent local rules. There are no simulated learners, fabricated analytics, or invented sources.',
      },
    ],
    whatYouCanDo: 'What you can do',
    capabilities: [
      'Import text-based PDFs and Markdown locally, with page and heading provenance.',
      'Create concepts manually or review AI suggestions grounded in exact quotations.',
      'Explore the graph in 3D or an accessible list, with region, status, tag, source, and relationship filters.',
      'Search concept metadata and full extracted text, then jump to the exact section.',
      'Generate rule-based quizzes, take them with immediate feedback, and track mastery and reviews.',
      'Export or import a portable JSON backup with validated, remapped IDs.',
    ],
    deliberateLimits: 'Deliberate limits',
    limits: [
      'No OCR. Image-only PDFs are detected and explained, not silently “read”.',
      'No guarantee that every enabled AI model will produce useful suggestions.',
      'Short-answer grading is approximate key-term matching, not semantic judgment.',
      'No cloud sync, collaboration, or account recovery in this version.',
      'Original PDF/Markdown binaries are not retained, only extracted text and provenance.',
      'No analytics or usage tracking is implemented.',
    ],
    howPiecesFit: 'How the pieces fit',
    sources: 'Sources',
    sourcesBody:
      'Browser-side parsing produces searchable text and citable sections. Nothing is uploaded during import.',
    graph: 'Graph',
    graphBody:
      'Concepts and typed relationships form the universe. Evidence references keep every claim connected to its source.',
    practice: 'Practice',
    practiceBody:
      'Quizzes are generated from stored descriptions and relationships, then feed mastery and spaced review locally.',
    footer: 'MindMesh 0.1.0 · schema v1 · Apache-2.0 · built with React, TypeScript, Three.js, and IndexedDB.',
    privacyModel: 'Privacy model',
    dataBackup: 'Data & backup',
  },
  id: {
    eyebrow: 'Tentang MindMesh',
    title: 'Ruang pengetahuan yang dapat Anda periksa',
    description:
      'MindMesh adalah lingkungan belajar local-first untuk mengubah materi sumber menjadi grafik terhubung yang berbasis bukti.',
    whyExists: 'Mengapa ini ada',
    whyBody:
      'Sebagian besar alat belajar memisahkan bacaan, catatan, diagram, dan kuis ke dalam silo yang terputus. MindMesh menyimpan sumber, konsep, relasi, dan catatan latihan dalam satu proyek lokal. Grafik bukan sekadar hiasan: ia adalah lapisan navigasi di atas bukti.',
    principles: [
      {
        title: 'Local-first secara bawaan',
        body: 'Proyek tersimpan di IndexedDB pada browser Anda. Tidak ada akun, ruang kerja cloud, telemetri, atau sinkronisasi tersembunyi.',
      },
      {
        title: 'Bukti sebelum keyakinan',
        body: 'Konsep dan relasi dapat merujuk ke nomor halaman, bagian judul, offset karakter, dan kutipan persis.',
      },
      {
        title: 'AI opsional dan ditinjau',
        body: 'Gunakan penyedia Anda sendiri. Teks dokumen hanya dikirim setelah persetujuan eksplisit, saran memerlukan kutipan terverifikasi, dan tidak ada yang ditambahkan secara otomatis.',
      },
      {
        title: 'Tanpa mekanika palsu',
        body: 'Pembuatan kuis, penilaian, penjadwalan, dan penguasaan menggunakan aturan lokal yang transparan. Tidak ada pelajar simulasi, analitik yang direkayasa, atau sumber yang diciptakan.',
      },
    ],
    whatYouCanDo: 'Yang dapat Anda lakukan',
    capabilities: [
      'Impor PDF berbasis teks dan Markdown secara lokal, dengan provenans halaman dan judul.',
      'Buat konsep secara manual atau tinjau saran AI yang berbasis kutipan persis.',
      'Jelajahi grafik dalam 3D atau daftar yang aksesibel, dengan filter wilayah, status, tag, sumber, dan relasi.',
      'Cari metadata konsep dan seluruh teks hasil ekstraksi, lalu lompat ke bagian yang tepat.',
      'Buat kuis berbasis aturan, kerjakan dengan umpan balik langsung, dan lacak penguasaan serta ulangan.',
      'Ekspor atau impor cadangan JSON portabel dengan ID tervalidasi dan dipetakan ulang.',
    ],
    deliberateLimits: 'Batasan yang disengaja',
    limits: [
      'Tanpa OCR. PDF hanya-gambar dideteksi dan dijelaskan, bukan diam-diam “dibaca”.',
      'Tidak ada jaminan bahwa setiap model AI yang aktif akan menghasilkan saran yang berguna.',
      'Penilaian jawaban singkat adalah pencocokan kata kunci perkiraan, bukan penilaian semantik.',
      'Tanpa sinkronisasi cloud, kolaborasi, atau pemulihan akun pada versi ini.',
      'Biner PDF/Markdown asli tidak disimpan, hanya teks hasil ekstraksi dan provenans.',
      'Tidak ada analitik atau pelacakan penggunaan yang diterapkan.',
    ],
    howPiecesFit: 'Bagaimana bagian-bagiannya menyatu',
    sources: 'Sumber',
    sourcesBody:
      'Parsing di sisi browser menghasilkan teks yang dapat dicari dan bagian yang dapat dikutip. Tidak ada yang diunggah saat impor.',
    graph: 'Grafik',
    graphBody:
      'Konsep dan relasi bertipe membentuk semesta. Referensi bukti menjaga setiap klaim tetap terhubung ke sumbernya.',
    practice: 'Latihan',
    practiceBody:
      'Kuis dibuat dari deskripsi dan relasi tersimpan, lalu mengisi penguasaan dan ulangan berjarak secara lokal.',
    footer: 'MindMesh 0.1.0 · schema v1 · Apache-2.0 · dibangun dengan React, TypeScript, Three.js, dan IndexedDB.',
    privacyModel: 'Model privasi',
    dataBackup: 'Data & cadangan',
  },
};

const principleIcons = [Lock, BookOpen, Sparkles, Layers];

export function AboutPage() {
  const c = useCopy(copy);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={c.eyebrow}
        title={c.title}
        description={c.description}
        orb="about"
        actions={<Badge variant="cyan">v0.1.0</Badge>}
      />

      <div className="surface relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/80">
            {c.whyExists}
          </p>
          <p className="mt-2 text-base leading-relaxed text-slate-300 sm:text-lg">
            {c.whyBody}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {c.principles.map((principle, index) => {
          const Icon = principleIcons[index];
          return (
            <div key={principle.title} className="surface rounded-xl p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.055] text-cyan-200">
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-semibold text-bright">{principle.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{principle.body}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-violet-300" /> {c.whatYouCanDo}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-5 text-xs leading-relaxed text-slate-400">
            {c.capabilities.map((item) => (
              <p key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                {item}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-amber-300" /> {c.deliberateLimits}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-5 text-xs leading-relaxed text-slate-400">
            {c.limits.map((item) => (
              <p key={item} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                {item}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-cyan-300" /> {c.howPiecesFit}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
              <FileText className="h-3.5 w-3.5 text-cyan-300" /> {c.sources}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {c.sourcesBody}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
              <Boxes className="h-3.5 w-3.5 text-violet-300" /> {c.graph}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {c.graphBody}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
              <Brain className="h-3.5 w-3.5 text-emerald-300" /> {c.practice}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {c.practiceBody}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-soft bg-white/[0.015] px-4 py-3">
        <p className="text-[10px] leading-relaxed text-slate-500">
          {c.footer}
        </p>
        <div className="flex gap-2">
          <Link to="/privacy" className={buttonClassName('ghost', 'sm')}>
            {c.privacyModel}
          </Link>
          <Link to="/data" className={buttonClassName('secondary', 'sm')}>
            {c.dataBackup} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
