import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Database,
  Eye,
  Laptop,
  Lock,
  Network,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { buttonClassName } from '@/components/ui/button-styles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCopy } from '@/app/language-store';

const copy = {
  en: {
    eyebrow: 'Privacy model',
    title: 'Where your data goes',
    description:
      'A concrete description of browser storage, AI transfers, and deletion. MindMesh has no application server and no telemetry.',
    noTracking: 'no tracking',
    shortVersion: 'Short version',
    shortVersionBody:
      'Projects, documents, extracted text, concepts, quizzes, and progress stay in this browser. Import and core study features make no network request. AI is off by default and sends only the scoped document chunks you explicitly approve, directly to the provider or local bridge you configure. Exports contain project data, never provider keys.',
    browserStorage: 'Browser storage',
    indexedDbBody:
      'Full project records: document metadata, extracted text and sections, concepts, relationships, source excerpts, quizzes, attempts, mastery records, and project preferences.',
    localStorageActive:
      'stores the selected project ID.',
    localStorageSettings:
      'stores non-secret provider preferences such as mode, URLs, model names, timeout, and output limits.',
    localStorageCache:
      'store up to 40 validated AI suggestion results for 7 days. Cached values include quoted evidence excerpts and generated descriptions, but not complete document text.',
    sessionStorageBody:
      'stores the bridge token and/or API key for the current browser tab session. It is never written to localStorage or included in exports.',
    outsideControl:
      "Browser extensions, device backups, browser sync, and other software with access to this browser profile are outside MindMesh's control.",
    networkBehavior: 'Network behavior',
    normalUse: 'Normal use',
    normalUseBody:
      'The app loads its own static assets. The sample project is fetched from the same deployment. PDF parsing uses a bundled worker, not a CDN. There are no analytics, advertising, session recording, or error-reporting requests.',
    aiAnalysis: 'AI analysis',
    aiAnalysisBody:
      'Only after you check the consent box, up to 8 chunks of extracted text are sent with the prompt. The request includes your bridge token or provider API key. The provider can see content, request metadata, and your network address according to its own policy.',
    opencodeBridge: 'OpenCode bridge',
    opencodeBridgeBody:
      'The browser calls a loopback HTTP server on this machine. That bridge invokes the OpenCode CLI with a temporary sandbox and fixed arguments. OpenCode may then send the content to whichever model provider it is configured to use, including remote providers. “Local bridge” does not necessarily mean a local model.',
    openaiMode: 'OpenAI-compatible mode',
    openaiModeBody:
      'The browser calls your configured endpoint directly. MindMesh does not proxy or retain the request.',
    highlights: [
      {
        title: 'No analytics',
        body: 'No page views, events, funnels, fingerprinting, or third-party scripts are implemented.',
      },
      {
        title: 'No account',
        body: 'No email, login, cloud identity, or recovery service. Your browser profile is the storage boundary.',
      },
      {
        title: 'No secrets in exports',
        body: 'Provider configuration and keys are separate from project records and excluded from backups.',
      },
    ],
    deletionControl: 'Deletion and control',
    deleteDocument: 'Delete a document',
    deleteDocumentBody:
      'Removes its extracted text and every evidence reference pointing to it. Concepts and relationships remain, without that citation.',
    deleteProject: 'Delete a project',
    deleteProjectBody:
      'Removes all of its documents, graph data, quizzes, attempts, and mastery records from IndexedDB.',
    clearAllProjects: 'Clear all projects',
    clearAllProjectsBody:
      'Available in Data & backup. AI settings and session secrets are stored separately and are not removed by that action.',
    removeSecrets: 'Remove secrets',
    removeSecretsBody:
      'Close the tab to clear sessionStorage, or overwrite/clear the key fields in Settings. Clear the analysis cache separately.',
    lastUpdated:
      'Last updated October 2026. This page describes the implemented behavior of MindMesh 0.1.0, not a legal certification.',
    aiSettings: 'AI settings',
    dataBackup: 'Data & backup',
  },
  id: {
    eyebrow: 'Model privasi',
    title: 'Ke mana data Anda pergi',
    description:
      'Penjelasan konkret tentang penyimpanan browser, transfer AI, dan penghapusan. MindMesh tidak memiliki server aplikasi dan tidak ada telemetri.',
    noTracking: 'tanpa pelacakan',
    shortVersion: 'Ringkasan singkat',
    shortVersionBody:
      'Proyek, dokumen, teks hasil ekstraksi, konsep, kuis, dan progres tetap berada di browser ini. Impor dan fitur belajar inti tidak membuat permintaan jaringan. AI nonaktif secara bawaan dan hanya mengirim potongan dokumen terbatas yang Anda setujui secara eksplisit, langsung ke penyedia atau bridge lokal yang Anda konfigurasi. Ekspor berisi data proyek, bukan kunci penyedia.',
    browserStorage: 'Penyimpanan browser',
    indexedDbBody:
      'Catatan proyek lengkap: metadata dokumen, teks dan bagian hasil ekstraksi, konsep, relasi, kutipan sumber, kuis, percobaan, catatan penguasaan, dan preferensi proyek.',
    localStorageActive:
      'menyimpan ID proyek yang dipilih.',
    localStorageSettings:
      'menyimpan preferensi penyedia yang bukan rahasia seperti mode, URL, nama model, batas waktu, dan batas keluaran.',
    localStorageCache:
      'menyimpan hingga 40 hasil saran AI yang tervalidasi selama 7 hari. Nilai cache mencakup kutipan bukti dan deskripsi yang dihasilkan, tetapi bukan teks dokumen lengkap.',
    sessionStorageBody:
      'menyimpan token bridge dan/atau kunci API untuk sesi tab browser saat ini. Nilai ini tidak pernah ditulis ke localStorage atau disertakan dalam ekspor.',
    outsideControl:
      'Ekstensi browser, cadangan perangkat, sinkronisasi browser, dan perangkat lunak lain yang memiliki akses ke profil browser ini berada di luar kendali MindMesh.',
    networkBehavior: 'Perilaku jaringan',
    normalUse: 'Penggunaan normal',
    normalUseBody:
      'Aplikasi memuat aset statisnya sendiri. Proyek sampel diambil dari deployment yang sama. Parsing PDF menggunakan worker yang dibundel, bukan CDN. Tidak ada permintaan analitik, iklan, perekaman sesi, atau pelaporan error.',
    aiAnalysis: 'Analisis AI',
    aiAnalysisBody:
      'Hanya setelah Anda mencentang kotak persetujuan, hingga 8 potongan teks hasil ekstraksi dikirim bersama prompt. Permintaan mencakup token bridge atau kunci API penyedia Anda. Penyedia dapat melihat konten, metadata permintaan, dan alamat jaringan Anda sesuai kebijakannya sendiri.',
    opencodeBridge: 'Bridge OpenCode',
    opencodeBridgeBody:
      'Browser memanggil server HTTP loopback di mesin ini. Bridge tersebut menjalankan OpenCode CLI dengan sandbox sementara dan argumen tetap. OpenCode kemudian dapat mengirim konten ke penyedia model yang dikonfigurasi, termasuk penyedia jarak jauh. “Bridge lokal” tidak selalu berarti model lokal.',
    openaiMode: 'Mode kompatibel OpenAI',
    openaiModeBody:
      'Browser memanggil endpoint yang Anda konfigurasi secara langsung. MindMesh tidak memproksi atau menyimpan permintaan tersebut.',
    highlights: [
      {
        title: 'Tanpa analitik',
        body: 'Tidak ada tampilan halaman, peristiwa, funnel, fingerprinting, atau skrip pihak ketiga yang diterapkan.',
      },
      {
        title: 'Tanpa akun',
        body: 'Tanpa email, login, identitas cloud, atau layanan pemulihan. Profil browser Anda adalah batas penyimpanan.',
      },
      {
        title: 'Tanpa rahasia dalam ekspor',
        body: 'Konfigurasi dan kunci penyedia terpisah dari catatan proyek dan dikecualikan dari cadangan.',
      },
    ],
    deletionControl: 'Penghapusan dan kendali',
    deleteDocument: 'Hapus dokumen',
    deleteDocumentBody:
      'Menghapus teks hasil ekstraksi dan setiap referensi bukti yang mengarah kepadanya. Konsep dan relasi tetap ada, tanpa kutipan tersebut.',
    deleteProject: 'Hapus proyek',
    deleteProjectBody:
      'Menghapus semua dokumen, data grafik, kuis, percobaan, dan catatan penguasaan proyek tersebut dari IndexedDB.',
    clearAllProjects: 'Hapus semua proyek',
    clearAllProjectsBody:
      'Tersedia di Data & cadangan. Pengaturan AI dan rahasia sesi disimpan terpisah dan tidak dihapus oleh tindakan tersebut.',
    removeSecrets: 'Hapus rahasia',
    removeSecretsBody:
      'Tutup tab untuk membersihkan sessionStorage, atau timpa/hapus kolom kunci di Pengaturan. Bersihkan cache analisis secara terpisah.',
    lastUpdated:
      'Terakhir diperbarui Oktober 2026. Halaman ini menjelaskan perilaku MindMesh 0.1.0 yang diterapkan, bukan sertifikasi hukum.',
    aiSettings: 'Pengaturan AI',
    dataBackup: 'Data & cadangan',
  },
};

const highlightIcons = [Eye, Laptop, Lock];

export function PrivacyPage() {
  const c = useCopy(copy);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={c.eyebrow}
        title={c.title}
        description={c.description}
        orb="about"
        actions={<Badge variant="emerald">{c.noTracking}</Badge>}
      />

      <div className="surface rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-200">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-bright">{c.shortVersion}</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
              {c.shortVersionBody}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-300" /> {c.browserStorage}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 text-[11px] leading-relaxed text-slate-500">
            <div>
              <p className="font-medium text-slate-200">
                IndexedDB · <code className="font-mono text-slate-300">mindmesh</code>
              </p>
              <p className="mt-0.5">
                {c.indexedDbBody}
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-200">localStorage</p>
              <p className="mt-0.5">
                <code className="font-mono text-slate-300">mindmesh.active-project</code> {c.localStorageActive}
              </p>
              <p className="mt-0.5">
                <code className="font-mono text-slate-300">mindmesh.ai.settings</code> {c.localStorageSettings}
              </p>
              <p className="mt-0.5">
                <code className="font-mono text-slate-300">mindmesh.ai.cache.*</code> and{' '}
                <code className="font-mono text-slate-300">mindmesh.ai.cache-index</code> {c.localStorageCache}
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-200">sessionStorage</p>
              <p className="mt-0.5">
                <code className="font-mono text-slate-300">mindmesh.ai.session-secrets</code> {c.sessionStorageBody}
              </p>
            </div>
            <p className="rounded-lg border border-line-soft bg-white/[0.02] px-3 py-2 text-[10px]">
              {c.outsideControl}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-4 w-4 text-violet-300" /> {c.networkBehavior}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 text-[11px] leading-relaxed text-slate-500">
            <div>
              <p className="font-medium text-slate-200">{c.normalUse}</p>
              <p className="mt-0.5">
                {c.normalUseBody}
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-200">{c.aiAnalysis}</p>
              <p className="mt-0.5">
                {c.aiAnalysisBody}
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-200">{c.opencodeBridge}</p>
              <p className="mt-0.5">
                {c.opencodeBridgeBody}
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-200">{c.openaiMode}</p>
              <p className="mt-0.5">
                {c.openaiModeBody}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {c.highlights.map((item, index) => {
          const Icon = highlightIcons[index];
          return (
            <div key={item.title} className="surface rounded-xl p-4">
              <Icon className="h-4 w-4 text-cyan-300" />
              <p className="mt-2 text-xs font-medium text-slate-200">{item.title}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{item.body}</p>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-rose-300" /> {c.deletionControl}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-5 text-[11px] leading-relaxed text-slate-500 sm:grid-cols-2">
          <div>
            <p className="font-medium text-slate-200">{c.deleteDocument}</p>
            <p className="mt-0.5">
              {c.deleteDocumentBody}
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-200">{c.deleteProject}</p>
            <p className="mt-0.5">
              {c.deleteProjectBody}
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-200">{c.clearAllProjects}</p>
            <p className="mt-0.5">
              {c.clearAllProjectsBody}
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-200">{c.removeSecrets}</p>
            <p className="mt-0.5">
              {c.removeSecretsBody}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-soft bg-white/[0.015] px-4 py-3">
        <p className="text-[10px] leading-relaxed text-slate-500">
          {c.lastUpdated}
        </p>
        <div className="flex gap-2">
          <Link to="/settings" className={buttonClassName('secondary', 'sm')}>
            {c.aiSettings}
          </Link>
          <Link to="/data" className={buttonClassName('ghost', 'sm')}>
            {c.dataBackup} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
