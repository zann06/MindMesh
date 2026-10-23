import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Boxes,
  ChevronDown,
  Filter,
  GitBranch,
  Grid3X3,
  List,
  Maximize2,
  MousePointer2,
  Plus,
  RotateCcw,
  Scan,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { toast } from '@/app/toast-store';
import { useCopy } from '@/app/language-store';
import { useRelationMeta } from '@/app/relation-copy';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonClassName } from '@/components/ui/button-styles';
import { Checkbox, Input, Select } from '@/components/ui/form';
import { SegmentedControl } from '@/components/ui/segmented';
import { EmptyState, LoadingPanel } from '@/components/ui/states';
import { NoProjectPanel } from '@/components/layout/no-project';
import { ConceptEditor } from '@/features/knowledge-graph/concept-editor';
import { RelationshipEditor } from '@/features/knowledge-graph/relationship-editor';
import { ConceptInspector } from '@/features/knowledge-graph/concept-inspector';
import {
  buildWorldLayout,
  computeGraphStats,
  conceptDegree,
  filterGraph,
} from '@/services/graph-engine/graph';
import {
  RELATION_TYPES,
  type Concept,
  type RelationType,
} from '@/core/domain/types';
import { cn } from '@/lib/utils';

const KnowledgeUniverse = lazy(() => import('./knowledge-universe'));

const copy = {
  en: {
    title: 'Universe',
    noProjectDescription: 'Explore the knowledge graph.',
    eyebrow: 'Spatial knowledge map',
    description: (concepts: number, relationships: number, tags: number) =>
      `${concepts} concepts · ${relationships} relationships · ${tags} tags. Drag to orbit, scroll to zoom, select a node to inspect evidence.`,
    connect: 'Connect',
    newConcept: 'New concept',
    controls: 'Universe controls',
    filterSr: 'Filter concepts in this universe',
    filterPlaceholder: 'Filter concepts by text…',
    viewLabel: 'Universe view',
    list: 'List',
    filters: 'Filters',
    showing: (visible: number, total: number) => `Showing ${visible}/${total}`,
    tagRegion: 'Tag region',
    allTags: 'All tags',
    reviewStatus: 'Review status',
    anyStatus: 'Any status',
    confirmed: 'Confirmed',
    suggested: 'Suggested',
    rejected: 'Rejected',
    sourceDocument: 'Source document',
    anySource: 'Any source',
    relationshipType: 'Relationship type',
    anyRelationship: 'Any relationship',
    nodeLabels: 'Node labels',
    labelDensity: 'Node label density',
    topConnected: 'Top connected',
    selectedNeighbors: 'Selected + neighbors',
    selectedOnly: 'Selected only',
    layout: 'Layout',
    graphLayout: 'Graph layout',
    tagRegions: 'Tag regions',
    sphere: 'Sphere',
    showRelationshipLines: 'Show relationship lines',
    resetFilters: 'Reset all filters',
    emptyTitle: 'The universe is empty',
    emptyBody:
      'Create a concept, import a source, or load the sample project to see the 3D knowledge graph come alive.',
    createConcept: 'Create a concept',
    importDocument: 'Import a document',
    noMatchTitle: 'No concepts match these filters',
    noMatchBody:
      'Relax the text, tag, status, source, or relationship filters to bring nodes back into the universe.',
    reset: 'Reset filters',
    webglTitle: 'WebGL is unavailable',
    webglBody:
      'This browser or device cannot render the 3D universe. The full graph is available as an accessible list, without losing any data or actions.',
    switchList: 'Switch to list view',
    preparing: 'Preparing 3D universe…',
    regionsOverflow: (count: number) => `+${count} regions`,
    frameTitle: 'Frame the whole universe in view',
    fitView: 'Fit view',
    pointerHint:
      'Click a node to inspect · double-click to open · drag to orbit · scroll to zoom',
    nodesSummary: (nodes: number, relationships: number, hidden: boolean) =>
      `${nodes} nodes · ${relationships} relationships${hidden ? ' · lines hidden' : ''}`,
    accessibleList:
      'Accessible concept list · select a row to inspect evidence · sorted by label',
    concepts: (count: number) => `${count} concepts`,
    noDescription: 'No description yet.',
    relationshipsTitle: 'Relationships',
    src: (count: number) => `${count} src`,
    openPage: (label: string) => `Open ${label} full page`,
    closeInspector: 'Close concept inspector',
    isolated: (count: number) =>
      `${count} isolated concept${count === 1 ? '' : 's'} · add relationships to connect the mesh.`,
    allConnected: 'Every concept is connected by at least one relationship.',
    practice: 'Practice this universe',
    regionFilter: (name: string, count: number) => `Filter to ${name} (${count})`,
    sceneErrorTitle: '3D view could not start',
    sceneErrorBody:
      'The WebGL scene failed to initialize. Every concept and relationship remains available in the accessible list view.',
    openList: 'Open list view',
    preferenceError: 'Could not save the view preference',
    unknownError: 'Unknown error',
    statuses: {
      suggested: 'suggested',
      confirmed: 'confirmed',
      rejected: 'rejected',
    },
  },
  id: {
    title: 'Semesta',
    noProjectDescription: 'Jelajahi graf pengetahuan.',
    eyebrow: 'Peta pengetahuan spasial',
    description: (concepts: number, relationships: number, tags: number) =>
      `${concepts} konsep · ${relationships} relasi · ${tags} tag. Seret untuk mengorbit, gulir untuk memperbesar, pilih simpul untuk memeriksa bukti.`,
    connect: 'Hubungkan',
    newConcept: 'Konsep baru',
    controls: 'Kontrol semesta',
    filterSr: 'Saring konsep di semesta ini',
    filterPlaceholder: 'Saring konsep berdasarkan teks…',
    viewLabel: 'Tampilan semesta',
    list: 'Daftar',
    filters: 'Saringan',
    showing: (visible: number, total: number) => `Menampilkan ${visible}/${total}`,
    tagRegion: 'Wilayah tag',
    allTags: 'Semua tag',
    reviewStatus: 'Status tinjauan',
    anyStatus: 'Semua status',
    confirmed: 'Dikonfirmasi',
    suggested: 'Disarankan',
    rejected: 'Ditolak',
    sourceDocument: 'Dokumen sumber',
    anySource: 'Semua sumber',
    relationshipType: 'Jenis relasi',
    anyRelationship: 'Semua relasi',
    nodeLabels: 'Label simpul',
    labelDensity: 'Kepadatan label simpul',
    topConnected: 'Paling terhubung',
    selectedNeighbors: 'Terpilih + tetangga',
    selectedOnly: 'Hanya terpilih',
    layout: 'Tata letak',
    graphLayout: 'Tata letak graf',
    tagRegions: 'Wilayah tag',
    sphere: 'Bola',
    showRelationshipLines: 'Tampilkan garis relasi',
    resetFilters: 'Atur ulang semua saringan',
    emptyTitle: 'Semesta masih kosong',
    emptyBody:
      'Buat konsep, impor sumber, atau muat proyek sampel untuk melihat graf pengetahuan 3D hidup.',
    createConcept: 'Buat konsep',
    importDocument: 'Impor dokumen',
    noMatchTitle: 'Tidak ada konsep yang cocok dengan saringan ini',
    noMatchBody:
      'Longgarkan saringan teks, tag, status, sumber, atau relasi untuk memunculkan simpul kembali ke semesta.',
    reset: 'Atur ulang saringan',
    webglTitle: 'WebGL tidak tersedia',
    webglBody:
      'Browser atau perangkat ini tidak dapat merender semesta 3D. Graf lengkap tersedia sebagai daftar yang aksesibel, tanpa kehilangan data atau tindakan apa pun.',
    switchList: 'Beralih ke tampilan daftar',
    preparing: 'Menyiapkan semesta 3D…',
    regionsOverflow: (count: number) => `+${count} wilayah`,
    frameTitle: 'Bingkai seluruh semesta dalam tampilan',
    fitView: 'Sesuaikan tampilan',
    pointerHint:
      'Klik simpul untuk memeriksa · klik dua kali untuk membuka · seret untuk mengorbit · gulir untuk memperbesar',
    nodesSummary: (nodes: number, relationships: number, hidden: boolean) =>
      `${nodes} simpul · ${relationships} relasi${hidden ? ' · garis disembunyikan' : ''}`,
    accessibleList:
      'Daftar konsep aksesibel · pilih baris untuk memeriksa bukti · diurutkan berdasarkan label',
    concepts: (count: number) => `${count} konsep`,
    noDescription: 'Belum ada deskripsi.',
    relationshipsTitle: 'Relasi',
    src: (count: number) => `${count} sumber`,
    openPage: (label: string) => `Buka halaman lengkap ${label}`,
    closeInspector: 'Tutup inspektur konsep',
    isolated: (count: number) =>
      `${count} konsep terisolasi · tambahkan relasi untuk menghubungkan mesh.`,
    allConnected: 'Setiap konsep terhubung oleh setidaknya satu relasi.',
    practice: 'Latih semesta ini',
    regionFilter: (name: string, count: number) => `Saring ke ${name} (${count})`,
    sceneErrorTitle: 'Tampilan 3D tidak dapat dimulai',
    sceneErrorBody:
      'Adegan WebGL gagal diinisialisasi. Setiap konsep dan relasi tetap tersedia di tampilan daftar yang aksesibel.',
    openList: 'Buka tampilan daftar',
    preferenceError: 'Tidak dapat menyimpan preferensi tampilan',
    unknownError: 'Galat tidak diketahui',
    statuses: {
      suggested: 'disarankan',
      confirmed: 'dikonfirmasi',
      rejected: 'ditolak',
    },
  },
} as const;

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<
  {
    children: ReactNode;
    onFallback: () => void;
    labels: { title: string; body: string; action: string };
  },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The fallback below is the user-facing report; no content leaves the browser.
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <Boxes className="h-8 w-8 text-slate-500" />
          <h2 className="mt-3 text-base font-semibold text-bright">
            {this.props.labels.title}
          </h2>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
            {this.props.labels.body}
          </p>
          <Button variant="primary" size="sm" className="mt-4" onClick={this.props.onFallback}>
            {this.props.labels.action}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

type ViewMode = '3d' | 'list';

export function UniversePage() {
  const c = useCopy(copy);
  const relationMeta = useRelationMeta();
  const navigate = useNavigate();
  const project = useWorkspaceStore((state) => state.activeProject);
  const updatePreferences = useWorkspaceStore((state) => state.updatePreferences);
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const tagParam = searchParams.get('tag');
  const focusParam = searchParams.get('focus');

  const [view, setView] = useState<ViewMode>(viewParam === 'list' ? 'list' : '3d');
  const [selectedId, setSelectedId] = useState<string | null>(focusParam);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState(tagParam ?? 'all');
  const [status, setStatus] = useState<'all' | 'confirmed' | 'suggested' | 'rejected'>('all');
  const [documentId, setDocumentId] = useState('all');
  const [relationType, setRelationType] = useState<RelationType | 'all'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const [fitRequest, setFitRequest] = useState(0);
  const [webglSupported] = useState(supportsWebGL);

  useEffect(() => {
    if (viewParam === 'list' || viewParam === '3d') setView(viewParam);
  }, [viewParam]);

  useEffect(() => {
    if (tagParam !== null) setTag(tagParam);
  }, [tagParam]);

  useEffect(() => {
    setSelectedId(focusParam);
  }, [focusParam]);

  const setParam = (key: string, value: string | null) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  const changeView = (next: ViewMode) => {
    setView(next);
    setParam('view', next === 'list' ? 'list' : null);
  };

  const selectConcept = (conceptId: string | null) => {
    setSelectedId(conceptId);
    setParam('focus', conceptId);
  };

  const changeTag = (value: string) => {
    setTag(value);
    if (value !== 'all') setParam('tag', value);
    else setParam('tag', null);
  };

  const filtered = useMemo(() => {
    if (!project) return { concepts: [] as Concept[], relationships: [] };
    return filterGraph(project, {
      query,
      tag,
      documentId,
      relationType,
      reviewStatus: status,
    });
  }, [project, query, tag, documentId, relationType, status]);

  const allStats = useMemo(() => (project ? computeGraphStats(project) : null), [project]);

  const layout = useMemo(
    () =>
      buildWorldLayout(
        filtered.concepts,
        project?.preferences.graphLayoutPreset ?? 'regions',
      ),
    [filtered.concepts, project?.preferences.graphLayoutPreset],
  );

  const degreeById = useMemo(() => {
    const map = new Map<string, number>();
    if (!project) return map;
    for (const concept of filtered.concepts) {
      map.set(concept.id, conceptDegree(project, concept.id));
    }
    return map;
  }, [project, filtered.concepts]);

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader title={c.title} description={c.noProjectDescription} orb="universe" />
        <NoProjectPanel />
      </div>
    );
  }

  const activeFilters =
    (query ? 1 : 0) +
    (tag !== 'all' ? 1 : 0) +
    (status !== 'all' ? 1 : 0) +
    (documentId !== 'all' ? 1 : 0) +
    (relationType !== 'all' ? 1 : 0);
  const showRelationships = project.preferences.showRelationships;
  const labelMode = project.preferences.labelMode;
  const selectedConcept = selectedId
    ? project.concepts.find((concept) => concept.id === selectedId)
    : undefined;

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setDocumentId('all');
    setRelationType('all');
    changeTag('all');
  };

  const pref = (patch: Parameters<typeof updatePreferences>[0]) => {
    void updatePreferences(patch).catch((error: unknown) => {
      toast.error(c.preferenceError, error instanceof Error ? error.message : c.unknownError);
    });
  };

  const filteredIds = new Set(filtered.concepts.map((concept) => concept.id));
  const graphRelationships = filtered.relationships;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={c.eyebrow}
        title={c.title}
        orb="universe"
        description={c.description(
          project.concepts.length,
          project.relationships.length,
          allStats?.tagCounts ? Object.keys(allStats.tagCounts).length : 0,
        )}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<GitBranch className="h-3.5 w-3.5" />}
              onClick={() => setRelationshipOpen(true)}
              disabled={project.concepts.length < 2}
            >
              {c.connect}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setCreateOpen(true)}
            >
              {c.newConcept}
            </Button>
          </>
        }
      />

      <section aria-label={c.controls} className="surface rounded-xl p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 basis-56">
            <span className="sr-only">{c.filterSr}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={c.filterPlaceholder}
              className="h-9 pl-9 text-xs"
            />
          </label>
          <SegmentedControl
            label={c.viewLabel}
            value={view}
            onChange={changeView}
            options={[
              { value: '3d', label: '3D', icon: <Boxes className="h-3 w-3" /> },
              { value: 'list', label: c.list, icon: <List className="h-3 w-3" /> },
            ]}
          />
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Filter className="h-3.5 w-3.5" />}
            onClick={() => setFiltersOpen((current) => !current)}
            aria-expanded={filtersOpen}
          >
            {c.filters}
            {activeFilters > 0 ? <Badge variant="cyan">{activeFilters}</Badge> : null}
            <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
          </Button>
          <span className="ml-auto text-[10px] text-slate-600">
            {c.showing(filtered.concepts.length, project.concepts.length)}
          </span>
        </div>

        {filtersOpen ? (
          <div className="mt-3 grid gap-2 border-t border-line-soft pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-slate-500">{c.tagRegion}</span>
              <Select value={tag} onChange={(event) => changeTag(event.target.value)}>
                <option value="all">{c.allTags}</option>
                {(allStats?.tagCounts ? Object.keys(allStats.tagCounts).sort() : []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-slate-500">{c.reviewStatus}</span>
              <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                <option value="all">{c.anyStatus}</option>
                <option value="confirmed">{c.confirmed}</option>
                <option value="suggested">{c.suggested}</option>
                <option value="rejected">{c.rejected}</option>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-slate-500">{c.sourceDocument}</span>
              <Select value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
                <option value="all">{c.anySource}</option>
                {project.documents.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.filename}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-slate-500">{c.relationshipType}</span>
              <Select
                value={relationType}
                onChange={(event) => setRelationType(event.target.value as RelationType | 'all')}
              >
                <option value="all">{c.anyRelationship}</option>
                {RELATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {relationMeta[type].label}
                  </option>
                ))}
              </Select>
            </label>
            <div className="sm:col-span-2">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-slate-500">{c.nodeLabels}</span>
              <SegmentedControl
                label={c.labelDensity}
                value={labelMode}
                onChange={(value) => pref({ labelMode: value })}
                options={[
                  { value: 'all', label: c.topConnected },
                  { value: 'related', label: c.selectedNeighbors },
                  { value: 'selected', label: c.selectedOnly },
                ]}
              />
            </div>
            <div className="sm:col-span-2">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-slate-500">{c.layout}</span>
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedControl
                  label={c.graphLayout}
                  value={project.preferences.graphLayoutPreset}
                  onChange={(value) => pref({ graphLayoutPreset: value })}
                  options={[
                    { value: 'regions', label: c.tagRegions, icon: <Grid3X3 className="h-3 w-3" /> },
                    { value: 'sphere', label: c.sphere, icon: <Maximize2 className="h-3 w-3" /> },
                  ]}
                />
                <Checkbox
                  checked={showRelationships}
                  onChange={(event) => pref({ showRelationships: event.target.checked })}
                  label={<span className="text-[11px]">{c.showRelationshipLines}</span>}
                  className="items-center"
                />
              </div>
            </div>
            {activeFilters > 0 ? (
              <div className="sm:col-span-2 lg:col-span-4">
                <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={resetFilters}>
                  {c.resetFilters}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {project.concepts.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title={c.emptyTitle}
          description={c.emptyBody}
          action={
            <>
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>
                {c.createConcept}
              </Button>
              <Link to="/documents" className={buttonClassName('secondary', 'sm')}>
                {c.importDocument}
              </Link>
            </>
          }
        />
      ) : filtered.concepts.length === 0 ? (
        <EmptyState
          icon={<Filter className="h-5 w-5" />}
          title={c.noMatchTitle}
          description={c.noMatchBody}
          action={
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              {c.reset}
            </Button>
          }
        />
      ) : (
        <div className="surface relative overflow-hidden rounded-2xl">
          {view === '3d' ? (
            <div className="relative h-[min(72vh,760px)] min-h-[500px] w-full">
              {!webglSupported ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <Boxes className="h-8 w-8 text-slate-500" />
                  <h2 className="mt-3 text-base font-semibold text-bright">{c.webglTitle}</h2>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                    {c.webglBody}
                  </p>
                  <Button variant="primary" size="sm" className="mt-4" onClick={() => changeView('list')}>
                    {c.switchList}
                  </Button>
                </div>
              ) : (
                <SceneBoundary
                  onFallback={() => changeView('list')}
                  labels={{ title: c.sceneErrorTitle, body: c.sceneErrorBody, action: c.openList }}
                >
                  <Suspense fallback={<div className="flex h-full items-center justify-center"><LoadingPanel label={c.preparing} /></div>}>
                    <KnowledgeUniverse
                      nodes={layout.nodes}
                      regions={layout.regions}
                      concepts={filtered.concepts}
                      relationships={graphRelationships}
                      selectedId={selectedId}
                      labelMode={labelMode}
                      showEdges={showRelationships}
                      fitRequest={fitRequest}
                      onSelect={selectConcept}
                      onOpen={(conceptId) => navigate(`/concepts/${conceptId}`)}
                    />
                  </Suspense>
                </SceneBoundary>
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
                <div className="pointer-events-auto flex flex-wrap gap-1.5 pr-2">
                  {layout.regions.slice(0, 5).map((region) => (
                    <button
                      key={region.name}
                      type="button"
                      onClick={() => changeTag(region.name)}
                      className="flex items-center gap-1.5 rounded-md border border-white/10 bg-[#090a0e]/75 px-2 py-1 text-[9px] text-slate-400 backdrop-blur hover:text-white"
                      title={c.regionFilter(region.name, region.count)}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: region.color }} />
                      {region.name}
                      <span className="text-slate-600">{region.count}</span>
                    </button>
                  ))}
                  {layout.regions.length > 5 ? (
                    <span className="rounded-md border border-white/10 bg-[#090a0e]/75 px-2 py-1 text-[9px] text-slate-500">
                      {c.regionsOverflow(layout.regions.length - 5)}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setFitRequest((current) => current + 1)}
                  className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-[#090a0e]/75 px-2 py-1 text-[9px] text-slate-400 backdrop-blur transition-colors hover:border-cyan-400/30 hover:text-cyan-100"
                  title={c.frameTitle}
                >
                  <Scan className="h-3 w-3" aria-hidden="true" />
                  {c.fitView}
                </button>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-3">
                <p className="max-w-md rounded-md border border-white/10 bg-[#090a0e]/75 px-2.5 py-1.5 text-[9px] leading-relaxed text-slate-500 backdrop-blur">
                  <MousePointer2 className="mr-1 inline h-2.5 w-2.5" />
                  {c.pointerHint}
                </p>
                <p className="rounded-md border border-white/10 bg-[#090a0e]/75 px-2 py-1 text-[9px] text-slate-500 backdrop-blur">
                  {c.nodesSummary(filtered.concepts.length, graphRelationships.length, !showRelationships)}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 sm:p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="text-[10px] text-slate-500">
                  {c.accessibleList}
                </p>
                <Badge variant="outline">{c.concepts(filtered.concepts.length)}</Badge>
              </div>
              <ul className="space-y-1.5">
                {[...filtered.concepts]
                  .sort((a, b) => a.label.localeCompare(b.label))
                  .map((concept) => {
                    const selected = concept.id === selectedId;
                    const degree = degreeById.get(concept.id) ?? 0;
                    return (
                      <li
                        key={concept.id}
                        className={cn(
                          'flex flex-col gap-2 rounded-lg border px-3 py-2.5 transition-colors sm:flex-row sm:items-center',
                          selected
                            ? 'border-cyan-400/30 bg-cyan-400/[0.045]'
                            : 'border-line-soft bg-white/[0.015] hover:border-slate-500/40',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => selectConcept(concept.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          aria-pressed={selected}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: layout.nodes.find((node) => node.conceptId === concept.id)?.color ?? '#64748b' }}
                          />
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-medium text-bright">{concept.label}</span>
                              <Badge
                                variant={
                                  concept.reviewStatus === 'confirmed'
                                    ? 'cyan'
                                    : concept.reviewStatus === 'rejected'
                                      ? 'rose'
                                      : 'amber'
                                }
                              >
                                {c.statuses[concept.reviewStatus]}
                              </Badge>
                              {concept.tags.slice(0, 2).map((conceptTag) => (
                                <span key={conceptTag} className="rounded border border-line px-1.5 py-0.5 text-[9px] text-slate-500">
                                  {conceptTag}
                                </span>
                              ))}
                            </span>
                            <span className="mt-0.5 line-clamp-1 block text-[10px] text-slate-500">
                              {concept.description || concept.sourceReferences[0]?.excerpt || c.noDescription}
                            </span>
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-3 pl-5 text-[10px] text-slate-600 sm:pl-0">
                          <span title={c.relationshipsTitle}>
                            <GitBranch className="mr-1 inline h-3 w-3" />
                            {degree}
                          </span>
                          <span>{c.src(concept.sourceReferences.length)}</span>
                          <Link
                            to={`/concepts/${concept.id}`}
                            className="rounded p-1 text-slate-500 hover:text-cyan-200"
                            aria-label={c.openPage(concept.label)}
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          {selectedId && selectedConcept && filteredIds.has(selectedConcept.id) ? (
            <div className="absolute inset-x-2 bottom-2 top-2 z-10 overflow-y-auto rounded-2xl bg-[#07080c]/80 p-1 backdrop-blur-sm lg:inset-y-3 lg:bottom-3 lg:left-auto lg:right-3 lg:w-[370px]">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => selectConcept(null)}
                  className="absolute right-3 top-3 z-10 rounded-md border border-line bg-[#0d0f14]/90 p-1 text-slate-400 hover:text-white"
                  aria-label={c.closeInspector}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <ConceptInspector
                  conceptId={selectedConcept.id}
                  onSelectConcept={selectConcept}
                  className="[&_.surface]:bg-[#0d0f14]/95"
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600">
        <p>
          {allStats?.isolatedConcepts
            ? c.isolated(allStats.isolatedConcepts)
            : c.allConnected}
        </p>
        <Link to="/learning" className="inline-flex items-center gap-1 text-cyan-300/80 hover:text-cyan-200">
          {c.practice} <Sparkles className="h-3 w-3" />
        </Link>
      </div>

      <ConceptEditor open={createOpen} onClose={() => setCreateOpen(false)} />
      <RelationshipEditor
        open={relationshipOpen}
        onClose={() => setRelationshipOpen(false)}
        defaultSourceId={selectedConcept?.id}
      />
    </div>
  );
}
