import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { buttonClassName } from '@/components/ui/button-styles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImportPanel } from '@/features/documents/import-panel';
import { useCopy } from '@/app/language-store';
import { OnboardingOverview } from './onboarding-overview';
import { SampleProjectButton } from './sample-button';

const copy = {
  en: {
    eyebrow: 'Welcome',
    title: 'A knowledge space you can inspect',
    description:
      'MindMesh is a local-first learning environment. Import a source, shape an evidence-backed graph, and practice with quizzes. AI is an optional accelerator, never a requirement.',
    goToDashboard: 'Go to dashboard',
    step1: 'Step 1',
    bringDocument: 'Bring a document',
    bringDocumentBody:
      'PDFs keep page-level references. Markdown keeps heading hierarchy and section offsets. Extraction happens in your browser.',
    startSample: 'Start with the sample',
    sampleBody:
      'An original sample document with six concepts, four typed relationships, and a four-question quiz. Useful for exploring the learning loop immediately.',
    sampleNote: 'The sample uses authored rules and text. No AI provider is contacted.',
    dataLives: 'Where your data lives',
    dataLivesBody1:
      "Projects, extracted text, graph records, quizzes, and learning history are stored in this browser's IndexedDB. There is no MindMesh account or telemetry.",
    dataLivesBody2:
      'Exports are versioned JSON files. Provider credentials and bridge tokens are never included.',
    privacyNotes: 'Read the privacy notes',
  },
  id: {
    eyebrow: 'Selamat datang',
    title: 'Ruang pengetahuan yang dapat Anda periksa',
    description:
      'MindMesh adalah lingkungan belajar local-first. Impor sumber, bentuk grafik berbasis bukti, dan berlatih dengan kuis. AI adalah akselerator opsional, bukan keharusan.',
    goToDashboard: 'Buka dasbor',
    step1: 'Langkah 1',
    bringDocument: 'Tambahkan dokumen',
    bringDocumentBody:
      'PDF menyimpan referensi tingkat halaman. Markdown menyimpan hierarki judul dan offset bagian. Ekstraksi berlangsung di browser Anda.',
    startSample: 'Mulai dengan sampel',
    sampleBody:
      'Dokumen sampel orisinal dengan enam konsep, empat relasi bertipe, dan kuis empat pertanyaan. Berguna untuk langsung menjelajahi alur belajar.',
    sampleNote: 'Sampel menggunakan aturan dan teks yang ditulis khusus. Tidak ada penyedia AI yang dihubungi.',
    dataLives: 'Tempat data Anda disimpan',
    dataLivesBody1:
      'Proyek, teks hasil ekstraksi, catatan grafik, kuis, dan riwayat belajar disimpan di IndexedDB browser ini. Tidak ada akun MindMesh atau telemetri.',
    dataLivesBody2:
      'Ekspor berupa file JSON berversi. Kredensial penyedia dan token bridge tidak pernah disertakan.',
    privacyNotes: 'Baca catatan privasi',
  },
};

export function WelcomePage() {
  const c = useCopy(copy);
  return (
    <div>
      <PageHeader
        eyebrow={c.eyebrow}
        title={c.title}
        description={c.description}
        orb="welcome"
        actions={
          <Link to="/" className={buttonClassName('ghost', 'md')}>
            {c.goToDashboard} <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <div className="relative p-6">
            <div className="grid-fade pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.06] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-violet-200">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {c.step1}
              </div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-bright">{c.bringDocument}</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-mist">{c.bringDocumentBody}</p>
              <div className="mt-5">
                <ImportPanel />
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{c.startSample}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-mist">{c.sampleBody}</p>
              <SampleProjectButton />
              <p className="text-[11px] leading-relaxed text-slate-500">{c.sampleNote}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{c.dataLives}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-mist">
              <p>{c.dataLivesBody1}</p>
              <p>{c.dataLivesBody2}</p>
              <Link to="/privacy" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">
                {c.privacyNotes} <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <OnboardingOverview />
      </div>
    </div>
  );
}
