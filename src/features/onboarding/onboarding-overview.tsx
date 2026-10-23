import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  BrainCircuit,
  FileText,
  LockKeyhole,
  Sparkles,
  Target,
} from 'lucide-react';
import { useCopy } from '@/app/language-store';

const copy = {
  en: {
    steps: [
      {
        title: 'Import with provenance',
        body: 'PDF pages and Markdown headings become real source references. Empty or scanned pages are reported honestly.',
      },
      {
        title: 'Build your concept graph',
        body: 'Create concepts manually, from headings, or review AI suggestions. Every relationship keeps its origin and review state.',
      },
      {
        title: 'Explore the universe',
        body: 'Navigate a deterministic 3D space, or switch to an accessible graph and list view with the same data.',
      },
      {
        title: 'Practice and revisit',
        body: 'Generate rule-based quizzes from approved concepts. Attempts and review dates persist locally.',
      },
    ],
    principles: [
      {
        title: 'Local by default',
        body: 'Projects live in IndexedDB. No account, no hosted backend, no telemetry.',
      },
      {
        title: 'AI is optional',
        body: 'Bring your own provider or local OpenCode CLI. Nothing is sent on import, and every AI action is explicit.',
      },
      {
        title: 'Evidence over confidence',
        body: 'Page and section references are verified against extracted text. AI relationships stay marked as suggestions until reviewed.',
      },
    ],
    howItWorks: 'How it works',
    dataPrivacy: 'Data & privacy',
    configureAI: 'Configure optional AI',
  },
  id: {
    steps: [
      {
        title: 'Impor dengan provenans',
        body: 'Halaman PDF dan judul Markdown menjadi referensi sumber yang nyata. Halaman kosong atau hasil pindai dilaporkan secara jujur.',
      },
      {
        title: 'Bangun grafik konsep Anda',
        body: 'Buat konsep secara manual, dari judul, atau tinjau saran AI. Setiap relasi menyimpan asal dan status tinjauannya.',
      },
      {
        title: 'Jelajahi semesta',
        body: 'Navigasi ruang 3D deterministik, atau beralih ke tampilan grafik dan daftar yang aksesibel dengan data yang sama.',
      },
      {
        title: 'Berlatih dan ulangi',
        body: 'Buat kuis berbasis aturan dari konsep yang disetujui. Percobaan dan tanggal ulangan tersimpan secara lokal.',
      },
    ],
    principles: [
      {
        title: 'Lokal secara bawaan',
        body: 'Proyek tersimpan di IndexedDB. Tanpa akun, tanpa backend terhosting, tanpa telemetri.',
      },
      {
        title: 'AI bersifat opsional',
        body: 'Gunakan penyedia Anda sendiri atau OpenCode CLI lokal. Tidak ada yang dikirim saat impor, dan setiap tindakan AI bersifat eksplisit.',
      },
      {
        title: 'Bukti di atas keyakinan',
        body: 'Referensi halaman dan bagian diverifikasi terhadap teks hasil ekstraksi. Relasi AI tetap ditandai sebagai saran sampai ditinjau.',
      },
    ],
    howItWorks: 'Cara kerjanya',
    dataPrivacy: 'Data & privasi',
    configureAI: 'Konfigurasi AI opsional',
  },
};

const stepIcons = [FileText, BrainCircuit, Boxes, Target];
const principleIcons = [LockKeyhole, Sparkles, Target];

export function OnboardingOverview({ compact = false }: { compact?: boolean }) {
  const c = useCopy(copy);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {c.steps.map((step, index) => {
          const Icon = stepIcons[index];
          return (
            <div
              key={step.title}
              className="surface-soft rounded-xl p-4 transition-colors hover:border-line"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-200">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="font-mono text-[10px] text-slate-600">0{index + 1}</span>
              </div>
              <h3 className="text-sm font-semibold text-bright">{step.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{step.body}</p>
            </div>
          );
        })}
      </div>

      {!compact ? (
        <div className="grid gap-3 md:grid-cols-3">
          {c.principles.map((principle, index) => {
            const Icon = principleIcons[index];
            return (
              <div key={principle.title} className="rounded-xl border border-line-soft bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-300">
                  <Icon className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
                  <h3 className="text-xs font-semibold uppercase tracking-[0.1em]">
                    {principle.title}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">{principle.body}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
        <Link to="/about" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">
          {c.howItWorks} <ArrowRight className="h-3 w-3" />
        </Link>
        <Link to="/privacy" className="text-slate-400 hover:text-slate-200">
          {c.dataPrivacy}
        </Link>
        <Link to="/settings" className="text-slate-400 hover:text-slate-200">
          {c.configureAI}
        </Link>
      </div>
    </div>
  );
}
