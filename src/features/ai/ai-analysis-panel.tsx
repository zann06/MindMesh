import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BrainCircuit,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Settings2,
  ShieldAlert,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { toast } from '@/app/toast-store';
import {
  providerModelFor,
  createAIProvider,
  useAISettingsStore,
} from '@/services/ai/settings';
import { analyzeDocumentWithAI, type AnalysisResult } from '@/services/ai/analysis';
import { chunkDocument } from '@/services/ai/chunking';
import type { DocumentRecord } from '@/core/domain/types';
import { relationLabel } from '@/app/relation-copy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonClassName } from '@/components/ui/button-styles';
import { Checkbox } from '@/components/ui/form';
import { Dialog } from '@/components/ui/dialog';
import { Notice, ProgressBar } from '@/components/ui/states';
import { sourceHref } from '@/features/documents/source-links';
import { useCopy } from '@/app/language-store';
import { cn, errorMessage } from '@/lib/utils';

const copy = {
  en: {
    noProvider: 'No AI provider is configured. Open Settings to choose one.',
    preparing: 'Preparing document content…',
    noNewConceptsTitle: 'No new concepts suggested',
    noNewConceptsBody:
      'The model returned no verified evidence-backed suggestions for this document.',
    analysisComplete: 'Analysis complete',
    readyForReview: (count: number) =>
      `${count} concept suggestion${count === 1 ? '' : 's'} ready for review.`,
    analysisCancelled: 'Analysis cancelled',
    nothingAdded: 'Nothing was added to your project.',
    nothingSelected: 'Nothing selected',
    chooseSuggestion: 'Choose at least one suggestion to add.',
    suggestionsAdded: 'Suggestions added',
    addedSummary: (concepts: number, relationships: number, warnings: number) =>
      `${concepts} concept${concepts === 1 ? '' : 's'} and ${relationships} relationship${relationships === 1 ? '' : 's'} added.${warnings > 0 ? ` ${warnings} warning(s).` : ''}`,
    reviewWarning: 'Review warning',
    couldNotAdd: 'Could not add suggestions',
    heading: 'AI concept suggestions',
    optional: 'optional',
    headingDescription:
      'Extracts candidate concepts and relationships with source quotations. Nothing is sent until you consent, and nothing is added until you select it.',
    aiOff: 'AI is off',
    aiOffBody:
      'MindMesh works fully without AI. To use suggestions, configure an OpenCode bridge or an OpenAI-compatible provider, then test the connection.',
    openSettings: 'Open AI settings',
    connectionUnverified: 'Connection not verified',
    connectionUnverifiedSuffix: ' AI actions stay unavailable until a real test succeeds.',
    testInSettings: 'Test connection in Settings',
    connectionVerified: 'Connection verified',
    bridge: 'OpenCode bridge',
    openaiCompatible: 'OpenAI-compatible',
    ready: 'ready',
    noTextTitle: 'No extractable text',
    noTextBody:
      'This document has no text layer. OCR is not included, so AI analysis cannot be used. Try a text-based PDF or Markdown source.',
    chunks: (total: number, analyzed: number) =>
      `${total} evidence chunk${total === 1 ? '' : 's'} · up to ${analyzed} analyzed per run`,
    cacheLine: 'cache 7 days · prompt mindmesh-concepts-2026-10-1',
    analysisFailed: 'Analysis failed',
    analyzeThis: 'Analyze this document',
    reviewScope: 'You will review the scope before any content leaves this browser.',
    conceptSuggestions: (count: number) =>
      `${count} concept suggestion${count === 1 ? '' : 's'}`,
    relationshipSuggestions: (count: number) =>
      `${count} relationship suggestion${count === 1 ? '' : 's'}`,
    chunksAnalyzed: 'chunks analyzed',
    cacheHits: (count: number) => ` · ${count} cache hit(s)`,
    tokens: (input: number, output: number) => ` · ${input} in / ${output} out tokens`,
    selectAll: 'Select all',
    discard: 'Discard',
    validationWarnings: (count: number) =>
      `${count} validation warning${count === 1 ? '' : 's'}`,
    noNewConceptsNotice:
      'No new concepts were suggested. Existing concepts may already cover this content, or the model found no verifiable quotations.',
    concepts: 'Concepts',
    confidence: (percent: number) => `${percent}% confidence`,
    quoteVerified: 'quote verified',
    openInDocument: 'Open in document',
    tags: 'Tags:',
    relationships: 'Relationships',
    unknown: 'Unknown',
    inference: 'inference',
    quoted: 'quoted',
    selectEndpoints: 'Select both endpoint concepts first.',
    selectedSummary: (concepts: number, relationships: number) =>
      `${concepts} concept${concepts === 1 ? '' : 's'} and ${relationships} relationship${relationships === 1 ? '' : 's'} selected`,
    addSelected: 'Add selected to project',
    dialogTitle: 'Send this document to an AI provider?',
    dialogDescription:
      'This is the only point where document text leaves your browser. Nothing is uploaded automatically.',
    cancelAnalysis: 'Cancel analysis',
    cancel: 'Cancel',
    analyzing: 'Analyzing…',
    analyzeDocument: 'Analyze document',
    dataScope: 'Data scope',
    source: 'Source:',
    atMost: (count: number) =>
      `At most ${count} chunk${count === 1 ? '' : 's'} of extracted text, roughly 6,000 characters each with overlap.`,
    destination: 'Destination:',
    localBridge: 'your local OpenCode bridge',
    originalFiles:
      'Original files and extracted text are not stored by MindMesh beyond this browser.',
    thirdPartyTitle: 'Third-party provider',
    thirdPartyBody:
      "Content is sent to the OpenAI-compatible endpoint you configured. Review that provider's retention and privacy terms before continuing.",
    analysisProgress: 'AI analysis progress',
    consentLabel: 'I consent to sending the extracted text scope above to this provider.',
    consentDescription:
      'This consent applies to this analysis run only. You can cancel at any time.',
    mayTake: 'Analysis may take up to a few minutes depending on the model.',
  },
  id: {
    noProvider: 'Tidak ada penyedia AI yang dikonfigurasi. Buka Pengaturan untuk memilih salah satu.',
    preparing: 'Menyiapkan konten dokumen…',
    noNewConceptsTitle: 'Tidak ada konsep baru yang disarankan',
    noNewConceptsBody:
      'Model tidak mengembalikan saran berbasis bukti yang terverifikasi untuk dokumen ini.',
    analysisComplete: 'Analisis selesai',
    readyForReview: (count: number) => `${count} saran konsep siap ditinjau.`,
    analysisCancelled: 'Analisis dibatalkan',
    nothingAdded: 'Tidak ada yang ditambahkan ke proyek Anda.',
    nothingSelected: 'Tidak ada yang dipilih',
    chooseSuggestion: 'Pilih setidaknya satu saran untuk ditambahkan.',
    suggestionsAdded: 'Saran ditambahkan',
    addedSummary: (concepts: number, relationships: number, warnings: number) =>
      `${concepts} konsep dan ${relationships} hubungan ditambahkan.${warnings > 0 ? ` ${warnings} peringatan.` : ''}`,
    reviewWarning: 'Tinjau peringatan',
    couldNotAdd: 'Tidak dapat menambahkan saran',
    heading: 'Saran konsep AI',
    optional: 'opsional',
    headingDescription:
      'Mengekstrak kandidat konsep dan hubungan dengan kutipan sumber. Tidak ada yang dikirim sampai Anda menyetujui, dan tidak ada yang ditambahkan sampai Anda memilihnya.',
    aiOff: 'AI nonaktif',
    aiOffBody:
      'MindMesh berfungsi penuh tanpa AI. Untuk menggunakan saran, konfigurasikan jembatan OpenCode atau penyedia yang kompatibel dengan OpenAI, lalu uji koneksi.',
    openSettings: 'Buka pengaturan AI',
    connectionUnverified: 'Koneksi belum terverifikasi',
    connectionUnverifiedSuffix: ' Tindakan AI tetap tidak tersedia sampai uji nyata berhasil.',
    testInSettings: 'Uji koneksi di Pengaturan',
    connectionVerified: 'Koneksi terverifikasi',
    bridge: 'Jembatan OpenCode',
    openaiCompatible: 'Kompatibel OpenAI',
    ready: 'siap',
    noTextTitle: 'Tidak ada teks yang dapat diekstrak',
    noTextBody:
      'Dokumen ini tidak memiliki lapisan teks. OCR tidak disertakan, sehingga analisis AI tidak dapat digunakan. Coba PDF berbasis teks atau sumber Markdown.',
    chunks: (total: number, analyzed: number) =>
      `${total} potongan bukti · hingga ${analyzed} dianalisis per proses`,
    cacheLine: 'cache 7 hari · prompt mindmesh-concepts-2026-10-1',
    analysisFailed: 'Analisis gagal',
    analyzeThis: 'Analisis dokumen ini',
    reviewScope: 'Anda akan meninjau cakupan sebelum konten apa pun meninggalkan browser ini.',
    conceptSuggestions: (count: number) => `${count} saran konsep`,
    relationshipSuggestions: (count: number) => `${count} saran hubungan`,
    chunksAnalyzed: 'potongan dianalisis',
    cacheHits: (count: number) => ` · ${count} cache hit`,
    tokens: (input: number, output: number) => ` · ${input} masuk / ${output} keluar token`,
    selectAll: 'Pilih semua',
    discard: 'Buang',
    validationWarnings: (count: number) => `${count} peringatan validasi`,
    noNewConceptsNotice:
      'Tidak ada konsep baru yang disarankan. Konsep yang ada mungkin sudah mencakup konten ini, atau model tidak menemukan kutipan yang dapat diverifikasi.',
    concepts: 'Konsep',
    confidence: (percent: number) => `${percent}% keyakinan`,
    quoteVerified: 'kutipan terverifikasi',
    openInDocument: 'Buka di dokumen',
    tags: 'Tag:',
    relationships: 'Hubungan',
    unknown: 'Tidak diketahui',
    inference: 'inferensi',
    quoted: 'dikutip',
    selectEndpoints: 'Pilih kedua konsep endpoint terlebih dahulu.',
    selectedSummary: (concepts: number, relationships: number) =>
      `${concepts} konsep dan ${relationships} hubungan dipilih`,
    addSelected: 'Tambahkan yang dipilih ke proyek',
    dialogTitle: 'Kirim dokumen ini ke penyedia AI?',
    dialogDescription:
      'Ini satu-satunya titik saat teks dokumen meninggalkan browser Anda. Tidak ada yang diunggah secara otomatis.',
    cancelAnalysis: 'Batalkan analisis',
    cancel: 'Batal',
    analyzing: 'Menganalisis…',
    analyzeDocument: 'Analisis dokumen',
    dataScope: 'Cakupan data',
    source: 'Sumber:',
    atMost: (count: number) =>
      `Maksimal ${count} potongan teks yang diekstrak, masing-masing sekitar 6.000 karakter dengan tumpang tindih.`,
    destination: 'Tujuan:',
    localBridge: 'jembatan OpenCode lokal Anda',
    originalFiles:
      'File asli dan teks yang diekstrak tidak disimpan oleh MindMesh di luar browser ini.',
    thirdPartyTitle: 'Penyedia pihak ketiga',
    thirdPartyBody:
      'Konten dikirim ke endpoint kompatibel OpenAI yang Anda konfigurasi. Tinjau ketentuan retensi dan privasi penyedia tersebut sebelum melanjutkan.',
    analysisProgress: 'Progres analisis AI',
    consentLabel: 'Saya menyetujui pengiriman cakupan teks yang diekstrak di atas ke penyedia ini.',
    consentDescription:
      'Persetujuan ini hanya berlaku untuk proses analisis ini. Anda dapat membatalkannya kapan saja.',
    mayTake: 'Analisis dapat memakan waktu hingga beberapa menit tergantung model.',
  },
};

export function AIAnalysisPanel({ document }: { document: DocumentRecord }) {
  const c = useCopy(copy);
  const project = useWorkspaceStore((state) => state.activeProject);
  const acceptAnalysis = useWorkspaceStore((state) => state.acceptAnalysis);
  const settings = useAISettingsStore((state) => state.settings);
  const status = useAISettingsStore((state) => state.status);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set());
  const [selectedRelationships, setSelectedRelationships] = useState<Set<string>>(new Set());
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const chunkInfo = useMemo(() => {
    if (!document.extractedText.trim()) return { total: 0, analyzed: 0 };
    const all = chunkDocument(document, { maxChars: 6_000, overlapChars: 350 });
    return { total: all.length, analyzed: Math.min(8, all.length) };
  }, [document]);

  const draftLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const concept of project?.concepts ?? []) map.set(concept.id, concept.label);
    for (const concept of result?.concepts ?? []) map.set(concept.id, concept.label);
    return map;
  }, [project?.concepts, result?.concepts]);

  if (!project) return null;

  const connected = status.state === 'connected';
  const modelLabel = providerModelFor(settings);
  const canRun = Boolean(document.extractedText.trim()) && connected;
  const hasAiSetup = settings.mode !== 'disabled';

  const startAnalysis = async () => {
    if (!consent || running) return;
    const provider = createAIProvider(settings);
    if (!provider) {
      setError(c.noProvider);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setError(null);
    setProgress({ current: 0, total: chunkInfo.analyzed, message: c.preparing });
    try {
      const analysis = await analyzeDocumentWithAI(project, document, provider, {
        providerId: provider.id,
        providerLabel: provider.label,
        model: modelLabel,
      }, {
        consentToSendContent: true,
        signal: controller.signal,
        onProgress: setProgress,
      });
      setResult(analysis);
      setSelectedConcepts(new Set());
      setSelectedRelationships(new Set());
      setDialogOpen(false);
      setConsent(false);
      if (analysis.concepts.length === 0 && analysis.relationships.length === 0) {
        toast.info(c.noNewConceptsTitle, c.noNewConceptsBody);
      } else {
        toast.success(c.analysisComplete, c.readyForReview(analysis.concepts.length));
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        toast.info(c.analysisCancelled, c.nothingAdded);
      } else {
        setError(errorMessage(caught));
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
      setProgress(null);
      provider.dispose();
    }
  };

  const endpointAvailable = (id: string) =>
    selectedConcepts.has(id) || project.concepts.some((concept) => concept.id === id);

  const selectAll = () => {
    if (!result) return;
    setSelectedConcepts(new Set(result.concepts.map((concept) => concept.id)));
    setSelectedRelationships(
      new Set(
        result.relationships
          .filter((relationship) => {
            const conceptIds = new Set(result.concepts.map((concept) => concept.id));
            const sourceReady =
              !conceptIds.has(relationship.sourceConceptId) ||
              result.concepts.some((concept) => concept.id === relationship.sourceConceptId);
            const targetReady =
              !conceptIds.has(relationship.targetConceptId) ||
              result.concepts.some((concept) => concept.id === relationship.targetConceptId);
            return sourceReady && targetReady;
          })
          .map((relationship) => relationship.id),
      ),
    );
  };

  const acceptSelected = async () => {
    if (!result) return;
    if (selectedConcepts.size === 0 && selectedRelationships.size === 0) {
      toast.info(c.nothingSelected, c.chooseSuggestion);
      return;
    }
    setAccepting(true);
    try {
      const counts = await acceptAnalysis(result, selectedConcepts, selectedRelationships);
      toast.success(
        c.suggestionsAdded,
        c.addedSummary(counts.conceptsAdded, counts.relationshipsAdded, counts.warnings.length),
      );
      if (counts.warnings.length > 0) {
        for (const warning of counts.warnings.slice(0, 3)) toast.info(c.reviewWarning, warning);
      }
      setResult(null);
      setSelectedConcepts(new Set());
      setSelectedRelationships(new Set());
    } catch (caught) {
      toast.error(c.couldNotAdd, errorMessage(caught));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <section aria-labelledby="ai-panel-heading" className="surface overflow-hidden rounded-xl">
      <div className="flex items-start justify-between gap-3 border-b border-line-soft p-5">
        <div>
          <h2 id="ai-panel-heading" className="flex items-center gap-2 text-sm font-semibold text-bright">
            <BrainCircuit className="h-4 w-4 text-violet-300" aria-hidden="true" />
            {c.heading}
            <Badge variant="outline">{c.optional}</Badge>
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            {c.headingDescription}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {!hasAiSetup ? (
          <div className="rounded-xl border border-line-soft bg-white/[0.02] p-4">
            <p className="text-sm font-medium text-slate-200">{c.aiOff}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {c.aiOffBody}
            </p>
            <Link to="/settings" className={cn(buttonClassName('secondary', 'sm'), 'mt-3')}>
              <Settings2 className="h-3.5 w-3.5" /> {c.openSettings}
            </Link>
          </div>
        ) : !connected ? (
          <div className="rounded-xl border border-line-soft bg-white/[0.02] p-4">
            <p className="text-sm font-medium text-slate-200">{c.connectionUnverified}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {status.message}{c.connectionUnverifiedSuffix}
            </p>
            <Link to="/settings" className={cn(buttonClassName('secondary', 'sm'), 'mt-3')}>
              <Settings2 className="h-3.5 w-3.5" /> {c.testInSettings}
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.035] px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-200">
                <Check className="h-3.5 w-3.5" /> {c.connectionVerified}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">
                {settings.mode === 'opencode' ? c.bridge : c.openaiCompatible} · {modelLabel}
              </p>
            </div>
            <Badge variant="emerald">{c.ready}</Badge>
          </div>
        )}

        {!document.extractedText.trim() ? (
          <Notice tone="warning" title={c.noTextTitle}>
            {c.noTextBody}
          </Notice>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line-soft bg-[#0d0f14]/45 px-3 py-2.5 text-[10px] text-slate-500">
            <span>
              {c.chunks(chunkInfo.total, chunkInfo.analyzed)}
            </span>
            <span>{c.cacheLine}</span>
          </div>
        )}

        {error && !dialogOpen ? (
          <Notice tone="error" title={c.analysisFailed}>
            {error}
          </Notice>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="violet"
            size="sm"
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            disabled={!canRun || running}
            onClick={() => {
              setDialogOpen(true);
              setError(null);
              setConsent(false);
            }}
          >
            {c.analyzeThis}
          </Button>
          <span className="text-[10px] text-slate-600">
            {c.reviewScope}
          </span>
        </div>

        {result ? (
          <div className="space-y-4 border-t border-line-soft pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-bright">
                  {c.conceptSuggestions(result.concepts.length)}
                  {result.relationships.length > 0
                    ? ` · ${c.relationshipSuggestions(result.relationships.length)}`
                    : ''}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {result.chunksAnalyzed}/{result.chunksTotal} {c.chunksAnalyzed}
                  {result.cacheHits > 0 ? c.cacheHits(result.cacheHits) : ''}
                  {result.usage?.reportedByProvider
                    ? c.tokens(result.usage.inputTokens ?? 0, result.usage.outputTokens ?? 0)
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {c.selectAll}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<X className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setResult(null);
                    setSelectedConcepts(new Set());
                    setSelectedRelationships(new Set());
                  }}
                >
                  {c.discard}
                </Button>
              </div>
            </div>

            {result.warnings.length > 0 ? (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-medium text-amber-200"
                  onClick={() => setWarningsOpen((current) => !current)}
                  aria-expanded={warningsOpen}
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {c.validationWarnings(result.warnings.length)}
                  </span>
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', warningsOpen && 'rotate-180')}
                  />
                </button>
                {warningsOpen ? (
                  <ul className="space-y-1 border-t border-amber-400/15 px-3 py-2 text-[10px] leading-relaxed text-amber-100/80">
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {result.concepts.length === 0 ? (
              <Notice tone="info">
                {c.noNewConceptsNotice}
              </Notice>
            ) : (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {c.concepts}
                </p>
                <ul className="space-y-2">
                  {result.concepts.map((concept) => {
                    const selected = selectedConcepts.has(concept.id);
                    const reference = concept.sourceReferences[0];
                    return (
                      <li
                        key={concept.id}
                        className={cn(
                          'rounded-xl border p-3 transition-colors',
                          selected
                            ? 'border-cyan-400/30 bg-cyan-400/[0.035]'
                            : 'border-line-soft bg-white/[0.015]',
                        )}
                      >
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-400"
                            checked={selected}
                            onChange={(event) =>
                              setSelectedConcepts((current) => {
                                const next = new Set(current);
                                if (event.target.checked) next.add(concept.id);
                                else {
                                  next.delete(concept.id);
                                  setSelectedRelationships((relationships) => {
                                    const without = new Set(relationships);
                                    for (const relationship of result.relationships) {
                                      if (
                                        relationship.sourceConceptId === concept.id ||
                                        relationship.targetConceptId === concept.id
                                      ) {
                                        without.delete(relationship.id);
                                      }
                                    }
                                    return without;
                                  });
                                }
                                return next;
                              })
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold text-bright">{concept.label}</span>
                              {concept.confidence !== undefined ? (
                                <Badge variant="violet">
                                  {c.confidence(Math.round(concept.confidence * 100))}
                                </Badge>
                              ) : null}
                              <Badge variant="outline">{c.quoteVerified}</Badge>
                            </span>
                            <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">
                              {concept.description}
                            </span>
                            {reference ? (
                              <span className="mt-2 block rounded-lg border-l-2 border-violet-400/30 bg-black/15 px-2.5 py-2 text-[10px] leading-relaxed text-slate-400">
                                “{reference.excerpt.slice(0, 500)}
                                {reference.excerpt.length > 500 ? '…' : ''}”
                                <Link
                                  to={sourceHref(reference, document)}
                                  className="mt-1 flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" /> {c.openInDocument}
                                </Link>
                              </span>
                            ) : null}
                            {concept.tags.length > 0 ? (
                              <span className="mt-1.5 block text-[10px] text-slate-600">
                                {c.tags} {concept.tags.join(', ')}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {result.relationships.length > 0 ? (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {c.relationships}
                </p>
                <ul className="space-y-1.5">
                  {result.relationships.map((relationship) => {
                    const disabled =
                      !endpointAvailable(relationship.sourceConceptId) ||
                      !endpointAvailable(relationship.targetConceptId);
                    const selected = selectedRelationships.has(relationship.id);
                    return (
                      <li
                        key={relationship.id}
                        className={cn(
                          'rounded-lg border px-3 py-2',
                          selected
                            ? 'border-violet-400/25 bg-violet-400/[0.035]'
                            : 'border-line-soft bg-white/[0.015]',
                          disabled && 'opacity-55',
                        )}
                      >
                        <label
                          className={cn(
                            'flex items-start gap-2.5',
                            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-violet-400"
                            checked={selected}
                            disabled={disabled}
                            onChange={(event) =>
                              setSelectedRelationships((current) => {
                                const next = new Set(current);
                                if (event.target.checked) next.add(relationship.id);
                                else next.delete(relationship.id);
                                return next;
                              })
                            }
                          />
                          <span className="min-w-0 flex-1 text-[11px] leading-relaxed">
                            <span className="flex flex-wrap items-center gap-1 font-medium text-slate-200">
                              {draftLabels.get(relationship.sourceConceptId) ?? c.unknown}
                              <ArrowRight className="h-3 w-3 text-slate-500" />
                              {draftLabels.get(relationship.targetConceptId) ?? c.unknown}
                              <Badge variant="violet">
                                {relationLabel(relationship.relationType)}
                              </Badge>
                              {relationship.provenance.method?.includes('inference') ? (
                                <Badge variant="amber">{c.inference}</Badge>
                              ) : (
                                <Badge variant="emerald">{c.quoted}</Badge>
                              )}
                            </span>
                            <span className="mt-1 block text-[10px] text-slate-500">
                              {relationship.explanation}
                            </span>
                            {disabled ? (
                              <span className="mt-1 flex items-center gap-1 text-[10px] text-amber-300/80">
                                <Ban className="h-2.5 w-2.5" /> {c.selectEndpoints}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
              <p className="text-[10px] text-slate-500">
                {c.selectedSummary(selectedConcepts.size, selectedRelationships.size)}
              </p>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Wand2 className="h-3.5 w-3.5" />}
                loading={accepting}
                disabled={selectedConcepts.size === 0 && selectedRelationships.size === 0}
                onClick={acceptSelected}
              >
                {c.addSelected}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (running) abortRef.current?.abort();
          setDialogOpen(false);
        }}
        title={c.dialogTitle}
        description={c.dialogDescription}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                if (running) abortRef.current?.abort();
                setDialogOpen(false);
              }}
            >
              {running ? c.cancelAnalysis : c.cancel}
            </Button>
            <Button
              variant="violet"
              onClick={startAnalysis}
              disabled={!consent || running || !canRun}
              loading={running}
              leftIcon={running ? undefined : <Sparkles className="h-4 w-4" />}
            >
              {running ? c.analyzing : c.analyzeDocument}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-line-soft bg-white/[0.02] p-3 text-[11px] leading-relaxed text-slate-400">
            <div className="flex items-center gap-2 text-slate-200">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              {c.dataScope}
            </div>
            <ul className="mt-2 space-y-1 text-slate-500">
              <li>{c.source} {document.filename}</li>
              <li>
                {c.atMost(chunkInfo.analyzed)}
              </li>
              <li>
                {c.destination} {settings.mode === 'opencode' ? c.localBridge : settings.openaiBaseUrl} ·{' '}
                {modelLabel}
              </li>
              <li>{c.originalFiles}</li>
            </ul>
          </div>

          {settings.mode === 'openai-compatible' ? (
            <Notice tone="warning" title={c.thirdPartyTitle}>
              {c.thirdPartyBody}
            </Notice>
          ) : null}

          {error ? (
            <Notice tone="error" title={c.analysisFailed}>
              {error}
            </Notice>
          ) : null}

          {running && progress ? (
            <div className="rounded-lg border border-line-soft bg-[#0d0f14]/60 px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-[11px]">
                <span className="flex items-center gap-2 text-slate-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {progress.message}
                </span>
                <span className="text-slate-500">
                  {progress.current}/{progress.total}
                </span>
              </div>
              <ProgressBar
                value={progress.total ? progress.current / progress.total : 0}
                label={c.analysisProgress}
              />
            </div>
          ) : null}

          <Checkbox
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            disabled={running}
            label={c.consentLabel}
            description={c.consentDescription}
          />
          <p className="text-[10px] text-slate-600">
            {c.mayTake}
          </p>
        </div>
      </Dialog>
    </section>
  );
}
