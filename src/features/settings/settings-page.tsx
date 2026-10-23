import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BrainCircuit,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  isAIConfigured,
  useAISettingsStore,
  type AIMode,
} from '@/services/ai/settings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/form';
import { Notice } from '@/components/ui/states';
import { PageHeader } from '@/components/layout/page-header';
import { toast } from '@/app/toast-store';
import { useCopy, type Widen } from '@/app/language-store';
import { cn, formatDate } from '@/lib/utils';

const copy = {
  en: {
    eyebrow: 'Local-first configuration',
    title: 'Settings',
    description:
      'AI is entirely optional. Provider settings and keys stay in this browser; connection tests use a real minimal request before enabling analysis.',
    status: {
      'not-configured': 'not configured',
      detecting: 'detecting',
      testing: 'testing',
      connected: 'connected',
      'model-unavailable': 'model unavailable',
      'rate-limited': 'rate limited',
      'auth-failed': 'auth failed',
      timeout: 'timeout',
      unavailable: 'unavailable',
      'invalid-response': 'invalid response',
      cancelled: 'cancelled',
    },
    configureFirst: 'Configure the provider first',
    connectionVerified: 'Connection verified',
    connectionFailed: 'Connection failed',
    connectionTestFailed: 'Connection test failed',
    providerUnreachable: 'The provider could not be reached.',
    copyUnavailable: 'Copy unavailable',
    copyUnavailableBody: 'Run npm run bridge in a terminal.',
    aiProvider: 'AI provider',
    off: 'Off',
    offDescription: 'No AI features. Everything else works.',
    opencode: 'OpenCode bridge',
    opencodeDescription: 'Local loopback bridge that invokes the OpenCode CLI.',
    openai: 'OpenAI-compatible',
    openaiDescription: 'Direct request to a compatible endpoint using your own key.',
    coreNoAiTitle: 'Core features do not depend on AI',
    coreNoAiBody:
      'Documents, graph exploration, evidence links, search, rule-based quizzes, progress, and exports all remain available with AI off.',
    bridgeUrl: 'Bridge URL',
    bridgeUrlHint: 'Loopback only by default.',
    bridgeToken: 'Bridge token',
    bridgeTokenHint: 'Printed by the bridge; stored for this session.',
    bridgeTokenPlaceholder: 'Paste the startup token',
    hideBridgeToken: 'Hide bridge token',
    showBridgeToken: 'Show bridge token',
    opencodeModel: 'OpenCode model',
    opencodeModelHint: 'Leave blank to use the bridge default.',
    startBridge: 'Start the local bridge',
    copy: 'Copy',
    copied: 'Copied',
    bridgeInstructionsPrefix: 'Use ',
    bridgeInstructionsSuffix:
      ' to start Vite and the bridge together. The bridge prints a random token at startup. It binds to loopback, serves a fixed set of endpoints, and never passes content through a shell.',
    baseUrl: 'Base URL',
    baseUrlHint: 'Include /v1 when the provider expects it.',
    model: 'Model',
    modelHint: 'Exact model id from your provider.',
    apiKey: 'API key',
    apiKeyHint:
      'Stored in sessionStorage only. Never written to localStorage or project exports.',
    apiKeyPlaceholder: 'Your provider key',
    hideApiKey: 'Hide API key',
    showApiKey: 'Show API key',
    thirdPartyTitle: 'Third-party data handling',
    thirdPartyBody:
      "When analysis runs, extracted document chunks are sent directly from your browser to this endpoint. Review the provider's retention and training policies. MindMesh does not proxy or store the request.",
    requestTimeout: 'Request timeout',
    seconds60: '60 seconds',
    seconds120: '120 seconds',
    seconds180: '180 seconds',
    seconds300: '300 seconds',
    maxTokens: 'Max output tokens',
    maxTokensHint: 'Keep this bounded to control cost and latency.',
    testingRealRequest: 'Testing real request…',
    testConnection: 'Test connection',
    loadModels: 'Load models',
    couldNotLoadModels: 'Could not load models',
    unknownError: 'Unknown error',
    statusNote: 'Status is never shown as connected without a successful request.',
    workspace: 'Workspace',
    workspaceDataPrefix: 'Project data lives in IndexedDB in this browser. Use ',
    workspaceDataLink: 'Data & backup',
    workspaceDataSuffix: ' to export, import, or clean up workspaces.',
    workspaceSeparate:
      'AI provider settings are separate from projects and are never included in project exports. Bridge tokens and API keys are kept in sessionStorage only.',
    workspacePrivacyPrefix: 'Read the ',
    workspacePrivacyLink: 'privacy model',
    workspacePrivacySuffix: ' for the exact data flow.',
    connection: 'Connection',
    lastSuccessfulTest: 'Last successful test:',
    noSuccessfulTest: 'No successful test recorded in this session.',
    availableModels: 'Available models',
    safety: 'Safety',
    safetyOff: 'AI is off by default.',
    safetyConsent: 'Every analysis run asks for explicit consent.',
    safetyQuotes: 'Suggestions require verifiable quotations and manual acceptance.',
    safetyKeys: 'Keys never enter project exports.',
    analysisCache: 'Analysis cache',
    analysisCacheBody:
      'Successful AI analyses are cached locally for 7 days by content hash, prompt version, provider, and model. The cache stores the validated suggestion JSON, including quoted evidence excerpts, but not the full document text. Up to 40 entries are kept.',
    cacheCleared: 'Analysis cache cleared',
    cacheClearFailed: 'Could not clear the cache',
    clearCache: 'Clear cache',
    byopTitle: 'Bring your own provider',
    byopBody:
      'MindMesh ships no developer key. You choose the provider, model, and cost. Free local models through the OpenCode bridge are supported.',
  },
  id: {
    eyebrow: 'Konfigurasi lokal',
    title: 'Pengaturan',
    description:
      'AI sepenuhnya opsional. Pengaturan penyedia dan kunci tetap di browser ini; uji koneksi menggunakan permintaan minimal nyata sebelum mengaktifkan analisis.',
    status: {
      'not-configured': 'belum dikonfigurasi',
      detecting: 'mendeteksi',
      testing: 'menguji',
      connected: 'terhubung',
      'model-unavailable': 'model tidak tersedia',
      'rate-limited': 'dibatasi laju',
      'auth-failed': 'autentikasi gagal',
      timeout: 'waktu habis',
      unavailable: 'tidak tersedia',
      'invalid-response': 'respons tidak valid',
      cancelled: 'dibatalkan',
    },
    configureFirst: 'Konfigurasikan penyedia terlebih dahulu',
    connectionVerified: 'Koneksi terverifikasi',
    connectionFailed: 'Koneksi gagal',
    connectionTestFailed: 'Uji koneksi gagal',
    providerUnreachable: 'Penyedia tidak dapat dijangkau.',
    copyUnavailable: 'Salin tidak tersedia',
    copyUnavailableBody: 'Jalankan npm run bridge di terminal.',
    aiProvider: 'Penyedia AI',
    off: 'Nonaktif',
    offDescription: 'Tanpa fitur AI. Semua fitur lain tetap berfungsi.',
    opencode: 'Jembatan OpenCode',
    opencodeDescription: 'Jembatan loopback lokal yang memanggil CLI OpenCode.',
    openai: 'Kompatibel OpenAI',
    openaiDescription: 'Permintaan langsung ke endpoint kompatibel menggunakan kunci Anda sendiri.',
    coreNoAiTitle: 'Fitur inti tidak bergantung pada AI',
    coreNoAiBody:
      'Dokumen, eksplorasi graf, tautan bukti, pencarian, kuis berbasis aturan, progres, dan ekspor tetap tersedia dengan AI nonaktif.',
    bridgeUrl: 'URL jembatan',
    bridgeUrlHint: 'Hanya loopback secara default.',
    bridgeToken: 'Token jembatan',
    bridgeTokenHint: 'Dicetak oleh jembatan; disimpan untuk sesi ini.',
    bridgeTokenPlaceholder: 'Tempel token awal',
    hideBridgeToken: 'Sembunyikan token jembatan',
    showBridgeToken: 'Tampilkan token jembatan',
    opencodeModel: 'Model OpenCode',
    opencodeModelHint: 'Biarkan kosong untuk memakai default jembatan.',
    startBridge: 'Jalankan jembatan lokal',
    copy: 'Salin',
    copied: 'Tersalin',
    bridgeInstructionsPrefix: 'Gunakan ',
    bridgeInstructionsSuffix:
      ' untuk menjalankan Vite dan jembatan bersamaan. Jembatan mencetak token acak saat mulai. Jembatan hanya terikat ke loopback, menyediakan kumpulan endpoint tetap, dan tidak pernah meneruskan konten melalui shell.',
    baseUrl: 'URL dasar',
    baseUrlHint: 'Sertakan /v1 jika penyedia mengharapkannya.',
    model: 'Model',
    modelHint: 'ID model persis dari penyedia Anda.',
    apiKey: 'Kunci API',
    apiKeyHint:
      'Hanya disimpan di sessionStorage. Tidak pernah ditulis ke localStorage atau ekspor proyek.',
    apiKeyPlaceholder: 'Kunci penyedia Anda',
    hideApiKey: 'Sembunyikan kunci API',
    showApiKey: 'Tampilkan kunci API',
    thirdPartyTitle: 'Penanganan data pihak ketiga',
    thirdPartyBody:
      'Saat analisis berjalan, potongan dokumen yang diekstrak dikirim langsung dari browser Anda ke endpoint ini. Tinjau kebijakan retensi dan pelatihan penyedia. MindMesh tidak memproksikan atau menyimpan permintaan tersebut.',
    requestTimeout: 'Batas waktu permintaan',
    seconds60: '60 detik',
    seconds120: '120 detik',
    seconds180: '180 detik',
    seconds300: '300 detik',
    maxTokens: 'Token keluaran maksimum',
    maxTokensHint: 'Batasi nilai ini untuk mengontrol biaya dan latensi.',
    testingRealRequest: 'Menguji permintaan nyata…',
    testConnection: 'Uji koneksi',
    loadModels: 'Muat model',
    couldNotLoadModels: 'Tidak dapat memuat model',
    unknownError: 'Kesalahan tidak diketahui',
    statusNote: 'Status tidak pernah ditampilkan sebagai terhubung tanpa permintaan yang berhasil.',
    workspace: 'Ruang kerja',
    workspaceDataPrefix: 'Data proyek tersimpan di IndexedDB pada browser ini. Gunakan ',
    workspaceDataLink: 'Data & cadangan',
    workspaceDataSuffix: ' untuk mengekspor, mengimpor, atau membersihkan ruang kerja.',
    workspaceSeparate:
      'Pengaturan penyedia AI terpisah dari proyek dan tidak pernah disertakan dalam ekspor proyek. Token jembatan dan kunci API hanya disimpan di sessionStorage.',
    workspacePrivacyPrefix: 'Baca ',
    workspacePrivacyLink: 'model privasi',
    workspacePrivacySuffix: ' untuk alur data yang tepat.',
    connection: 'Koneksi',
    lastSuccessfulTest: 'Uji berhasil terakhir:',
    noSuccessfulTest: 'Belum ada uji berhasil yang tercatat dalam sesi ini.',
    availableModels: 'Model tersedia',
    safety: 'Keamanan',
    safetyOff: 'AI nonaktif secara default.',
    safetyConsent: 'Setiap analisis meminta persetujuan eksplisit.',
    safetyQuotes: 'Saran memerlukan kutipan yang dapat diverifikasi dan penerimaan manual.',
    safetyKeys: 'Kunci tidak pernah masuk ke ekspor proyek.',
    analysisCache: 'Cache analisis',
    analysisCacheBody:
      'Analisis AI yang berhasil di-cache secara lokal selama 7 hari berdasarkan hash konten, versi prompt, penyedia, dan model. Cache menyimpan JSON saran yang tervalidasi, termasuk kutipan bukti, tetapi bukan teks dokumen lengkap. Maksimal 40 entri disimpan.',
    cacheCleared: 'Cache analisis dibersihkan',
    cacheClearFailed: 'Tidak dapat membersihkan cache',
    clearCache: 'Bersihkan cache',
    byopTitle: 'Bawa penyedia Anda sendiri',
    byopBody:
      'MindMesh tidak menyertakan kunci pengembang. Anda memilih penyedia, model, dan biaya. Model lokal gratis melalui jembatan OpenCode didukung.',
  },
};

type CopyShape = Widen<(typeof copy)[keyof typeof copy]>;

function modes(c: CopyShape): Array<{ value: AIMode; label: string; description: string }> {
  return [
    { value: 'disabled', label: c.off, description: c.offDescription },
    { value: 'opencode', label: c.opencode, description: c.opencodeDescription },
    { value: 'openai-compatible', label: c.openai, description: c.openaiDescription },
  ];
}

function statusLabel(c: CopyShape, state: keyof CopyShape['status'] | string) {
  return c.status[state as keyof CopyShape['status']] ?? state.replaceAll('-', ' ');
}

export function SettingsPage() {
  const c = useCopy(copy);
  const settings = useAISettingsStore((state) => state.settings);
  const status = useAISettingsStore((state) => state.status);
  const modelsLoading = useAISettingsStore((state) => state.modelsLoading);
  const updateSettings = useAISettingsStore((state) => state.updateSettings);
  const testConnection = useAISettingsStore((state) => state.testConnection);
  const loadModels = useAISettingsStore((state) => state.loadModels);
  const clearCache = useAISettingsStore((state) => state.clearCache);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [copied, setCopied] = useState(false);

  const configured = isAIConfigured(settings);

  const test = async () => {
    if (!configured) {
      toast.info(c.configureFirst);
      return;
    }
    setTesting(true);
    try {
      const result = await testConnection();
      if (result.ok) {
        toast.success(c.connectionVerified, result.message);
      } else {
        toast.error(c.connectionFailed, result.message);
      }
    } catch (error) {
      toast.error(
        c.connectionTestFailed,
        error instanceof Error ? error.message : c.providerUnreachable,
      );
    } finally {
      setTesting(false);
    }
  };

  const copyBridge = async () => {
    try {
      await navigator.clipboard.writeText('npm run bridge');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.info(c.copyUnavailable, c.copyUnavailableBody);
    }
  };

  const statusTone =
    status.state === 'connected'
      ? 'emerald'
      : status.state === 'testing' || status.state === 'detecting'
        ? 'cyan'
        : status.state === 'not-configured'
          ? 'outline'
          : 'rose';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={c.eyebrow}
        title={c.title}
        description={c.description}
        orb="settings"
        actions={<Badge variant={statusTone}>{statusLabel(c, status.state)}</Badge>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-violet-300" /> {c.aiProvider}
              </CardTitle>
              <Badge variant={settings.mode === 'disabled' ? 'outline' : 'violet'}>{settings.mode}</Badge>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-2 sm:grid-cols-3">
                {modes(c).map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => updateSettings({ mode: mode.value })}
                    aria-pressed={settings.mode === mode.value}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-colors',
                      settings.mode === mode.value
                        ? 'border-cyan-400/35 bg-cyan-400/[0.045]'
                        : 'border-line-soft bg-white/[0.015] hover:border-slate-500/40',
                    )}
                  >
                    <p className="text-xs font-semibold text-bright">{mode.label}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{mode.description}</p>
                  </button>
                ))}
              </div>

              {settings.mode === 'disabled' ? (
                <Notice tone="info" title={c.coreNoAiTitle}>
                  {c.coreNoAiBody}
                </Notice>
              ) : null}

              {settings.mode === 'opencode' ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={c.bridgeUrl} htmlFor="bridge-url" hint={c.bridgeUrlHint}>
                      <Input
                        id="bridge-url"
                        value={settings.bridgeUrl}
                        onChange={(event) => updateSettings({ bridgeUrl: event.target.value })}
                        placeholder="http://127.0.0.1:4319"
                        spellCheck={false}
                      />
                    </Field>
                    <Field label={c.bridgeToken} htmlFor="bridge-token" hint={c.bridgeTokenHint}>
                      <div className="relative">
                        <Input
                          id="bridge-token"
                          type={tokenVisible ? 'text' : 'password'}
                          value={settings.bridgeToken}
                          onChange={(event) => updateSettings({ bridgeToken: event.target.value })}
                          placeholder={c.bridgeTokenPlaceholder}
                          autoComplete="off"
                          spellCheck={false}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setTokenVisible((current) => !current)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-200"
                          aria-label={tokenVisible ? c.hideBridgeToken : c.showBridgeToken}
                        >
                          {tokenVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </Field>
                  </div>
                  <Field label={c.opencodeModel} htmlFor="bridge-model" hint={c.opencodeModelHint}>
                    <Input
                      id="bridge-model"
                      value={settings.bridgeModel}
                      onChange={(event) => updateSettings({ bridgeModel: event.target.value })}
                      placeholder="e.g. opencode/deepseek-v4.1-flash-free"
                      list="bridge-model-options"
                      spellCheck={false}
                    />
                    <datalist id="bridge-model-options">
                      {status.models.map((model) => (
                        <option key={model} value={model} />
                      ))}
                    </datalist>
                  </Field>
                  <div className="rounded-xl border border-line-soft bg-[#0d0f14]/50 p-3">
                    <p className="flex items-center gap-2 text-[11px] font-medium text-slate-200">
                      <Server className="h-3.5 w-3.5 text-cyan-300" /> {c.startBridge}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 rounded border border-line bg-black/30 px-2.5 py-1.5 font-mono text-[10px] text-cyan-200">
                        npm run bridge
                      </code>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        onClick={copyBridge}
                      >
                        {copied ? c.copied : c.copy}
                      </Button>
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                      {c.bridgeInstructionsPrefix}
                      <span className="font-mono text-slate-400">npm run dev:all</span>
                      {c.bridgeInstructionsSuffix}
                    </p>
                  </div>
                </div>
              ) : null}

              {settings.mode === 'openai-compatible' ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label={c.baseUrl}
                      htmlFor="openai-base-url"
                      hint={c.baseUrlHint}
                    >
                      <Input
                        id="openai-base-url"
                        value={settings.openaiBaseUrl}
                        onChange={(event) => updateSettings({ openaiBaseUrl: event.target.value })}
                        placeholder="https://api.openai.com/v1"
                        spellCheck={false}
                      />
                    </Field>
                    <Field label={c.model} htmlFor="openai-model" hint={c.modelHint}>
                      <Input
                        id="openai-model"
                        value={settings.openaiModel}
                        onChange={(event) => updateSettings({ openaiModel: event.target.value })}
                        placeholder="e.g. gpt-4.1-mini"
                        list="openai-model-options"
                        spellCheck={false}
                      />
                      <datalist id="openai-model-options">
                        {status.models.map((model) => (
                          <option key={model} value={model} />
                        ))}
                      </datalist>
                    </Field>
                  </div>
                  <Field
                    label={c.apiKey}
                    htmlFor="openai-key"
                    hint={c.apiKeyHint}
                  >
                    <div className="relative">
                      <Input
                        id="openai-key"
                        type={apiKeyVisible ? 'text' : 'password'}
                        value={settings.openaiApiKey}
                        onChange={(event) => updateSettings({ openaiApiKey: event.target.value })}
                        placeholder={c.apiKeyPlaceholder}
                        autoComplete="off"
                        spellCheck={false}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setApiKeyVisible((current) => !current)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-200"
                        aria-label={apiKeyVisible ? c.hideApiKey : c.showApiKey}
                      >
                        {apiKeyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </Field>
                  <Notice tone="warning" title={c.thirdPartyTitle}>
                    {c.thirdPartyBody}
                  </Notice>
                </div>
              ) : null}

              {settings.mode !== 'disabled' ? (
                <div className="grid gap-3 border-t border-line-soft pt-4 sm:grid-cols-2">
                  <Field label={c.requestTimeout} htmlFor="ai-timeout">
                    <Select
                      id="ai-timeout"
                      value={settings.timeoutMs}
                      onChange={(event) => updateSettings({ timeoutMs: Number(event.target.value) })}
                    >
                      <option value={60_000}>{c.seconds60}</option>
                      <option value={120_000}>{c.seconds120}</option>
                      <option value={180_000}>{c.seconds180}</option>
                      <option value={300_000}>{c.seconds300}</option>
                    </Select>
                  </Field>
                  <Field
                    label={c.maxTokens}
                    htmlFor="ai-max-tokens"
                    hint={c.maxTokensHint}
                  >
                    <Input
                      id="ai-max-tokens"
                      type="number"
                      min={64}
                      max={8000}
                      value={settings.maxOutputTokens}
                      onChange={(event) =>
                        updateSettings({
                          maxOutputTokens: Math.max(64, Math.min(8000, Number(event.target.value) || 2500)),
                        })
                      }
                    />
                  </Field>
                </div>
              ) : null}

              {settings.mode !== 'disabled' ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                    onClick={test}
                    disabled={!configured || testing}
                  >
                    {testing ? c.testingRealRequest : c.testConnection}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<RefreshCw className={cn('h-3.5 w-3.5', modelsLoading && 'animate-spin')} />}
                    onClick={() => {
                      void loadModels().catch((error: unknown) =>
                        toast.error(c.couldNotLoadModels, error instanceof Error ? error.message : c.unknownError),
                      );
                    }}
                    disabled={!configured || modelsLoading}
                  >
                    {c.loadModels}
                  </Button>
                  <span className="text-[10px] text-slate-600">
                    {c.statusNote}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-slate-400" /> {c.workspace}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5 text-[11px] leading-relaxed text-slate-500">
              <p>
                {c.workspaceDataPrefix}
                <Link to="/data" className="text-cyan-300 hover:text-cyan-200">
                  {c.workspaceDataLink}
                </Link>
                {c.workspaceDataSuffix}
              </p>
              <p>
                {c.workspaceSeparate}
              </p>
              <p>
                {c.workspacePrivacyPrefix}
                <Link to="/privacy" className="text-cyan-300 hover:text-cyan-200">
                  {c.workspacePrivacyLink}
                </Link>
                {c.workspacePrivacySuffix}
              </p>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2">
                {status.state === 'connected' ? (
                  <Wifi className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-slate-500" />
                )}
                {c.connection}
              </CardTitle>
              <Badge variant={statusTone}>{statusLabel(c, status.state)}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 p-4 text-[10px] leading-relaxed text-slate-500">
              <p>{status.message}</p>
              {status.lastTestedAt ? (
                <p>{c.lastSuccessfulTest} {formatDate(status.lastTestedAt, true)}</p>
              ) : (
                <p>{c.noSuccessfulTest}</p>
              )}
              {status.models.length > 0 ? (
                <div>
                  <p className="mb-1 mt-2 text-[9px] uppercase tracking-[0.12em] text-slate-600">
                    {c.availableModels}
                  </p>
                  <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">
                    {status.models.slice(0, 40).map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() =>
                          updateSettings(
                            settings.mode === 'opencode'
                              ? { bridgeModel: model }
                              : { openaiModel: model },
                          )
                        }
                        className="max-w-full truncate rounded border border-line bg-white/[0.02] px-1.5 py-0.5 text-[9px] text-slate-400 hover:border-cyan-400/30 hover:text-cyan-200"
                        title={model}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" /> {c.safety}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 text-[10px] leading-relaxed text-slate-500">
              <p className="flex gap-1.5">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300" /> {c.safetyOff}
              </p>
              <p className="flex gap-1.5">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300" /> {c.safetyConsent}
              </p>
              <p className="flex gap-1.5">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300" /> {c.safetyQuotes}
              </p>
              <p className="flex gap-1.5">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300" /> {c.safetyKeys}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5 text-slate-400" /> {c.analysisCache}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-[10px] leading-relaxed text-slate-500">
                {c.analysisCacheBody}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                leftIcon={<X className="h-3.5 w-3.5" />}
                loading={clearing}
                onClick={async () => {
                  setClearing(true);
                  try {
                    await clearCache();
                    toast.success(c.cacheCleared);
                  } catch {
                    toast.error(c.cacheClearFailed);
                  } finally {
                    setClearing(false);
                  }
                }}
              >
                {c.clearCache}
              </Button>
            </CardContent>
          </Card>

          <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.025] px-4 py-3 text-[10px] leading-relaxed text-slate-500">
            <p className="flex items-center gap-1.5 font-medium text-violet-200">
              <KeyRound className="h-3 w-3" /> {c.byopTitle}
            </p>
            <p className="mt-1">
              {c.byopBody}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
