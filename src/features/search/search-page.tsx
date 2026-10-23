import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Filter,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonClassName } from '@/components/ui/button-styles';
import { Input, Select } from '@/components/ui/form';
import { EmptyState } from '@/components/ui/states';
import { SegmentedControl } from '@/components/ui/segmented';
import { NoProjectPanel } from '@/components/layout/no-project';
import { RELATION_TYPE_META, type Concept, type DocumentRecord, type DocumentSection } from '@/core/domain/types';
import { useCopy } from '@/app/language-store';
import { cn, formatBytes } from '@/lib/utils';

type SearchScope = 'all' | 'concepts' | 'documents';

interface DocumentMatch {
  document: DocumentRecord;
  section: DocumentSection;
  snippet: string;
  occurrences: number;
}

const copy = {
  en: {
    title: 'Search',
    noProjectDescription: 'Search concepts and source text locally.',
    description:
      'Search concept labels, descriptions, aliases, tags, and the full extracted text of every source. Everything happens locally.',
    badge: (concepts: number, sources: number) => `${concepts} concepts · ${sources} sources`,
    searchProject: 'Search project',
    searchLabel: 'Search concepts and document text',
    clearSearch: 'Clear search',
    placeholder: 'Search concepts, evidence, and document text…',
    searchScope: 'Search scope',
    everything: 'Everything',
    concepts: 'Concepts',
    sourceText: 'Source text',
    clearFilters: (count: number) => `Clear ${count} filter${count === 1 ? '' : 's'}`,
    filters: 'Filters',
    hint: 'Type at least 2 characters. Search runs against the local project; no AI provider is involved.',
    reviewStatus: 'Concept review status',
    anyStatus: 'Any status',
    statusLabels: {
      confirmed: 'confirmed',
      suggested: 'suggested',
      rejected: 'rejected',
    },
    conceptTag: 'Concept tag',
    anyTag: 'Any tag',
    filterNote:
      'Status and tag filters apply to concepts only. Source-text results are always shown for the current query.',
    keepTyping: 'Keep typing',
    searchKnowledge: 'Search your knowledge',
    keepTypingBody: 'Enter at least two characters to search concepts and full document text.',
    searchKnowledgeBody:
      'Find a concept by name or alias, or locate a phrase inside an imported PDF or Markdown source. Results link back to exact sections.',
    noMatches: 'No matches',
    noMatchesBody: (query: string, filtered: boolean) =>
      `Nothing in this project matches “${query}”${filtered ? ' with the current filters' : ''}. Try a shorter phrase, a concept alias, or clear the filters.`,
    clearTheFilters: 'Clear filters',
    results: (total: number, query: string, documentCount: number) =>
      `${total} result${total === 1 ? '' : 's'} for “${query}”${
        documentCount > 0
          ? ` · ${documentCount} source${documentCount === 1 ? '' : 's'} with text matches`
          : ''
      }`,
    noDescription: 'No description.',
    sourceCount: (count: number) => `${count} source${count === 1 ? '' : 's'}`,
    page: (page: number) => `page ${page}`,
    section: 'section',
    matchCount: (count: number) => `${count} match${count === 1 ? '' : 'es'}`,
    noConceptMatch:
      'No concept labels or descriptions matched. Source text did, so consider creating a concept from one of these sections.',
    filtersApply: 'Filters apply to concept search.',
    browseAll: 'Browse all concepts',
    relationshipTypes: (count: number) => `${count} relationship types supported`,
  },
  id: {
    title: 'Pencarian',
    noProjectDescription: 'Cari konsep dan teks sumber secara lokal.',
    description:
      'Cari label konsep, deskripsi, alias, tag, dan seluruh teks hasil ekstraksi dari setiap sumber. Semuanya berlangsung lokal.',
    badge: (concepts: number, sources: number) => `${concepts} konsep · ${sources} sumber`,
    searchProject: 'Cari proyek',
    searchLabel: 'Cari konsep dan teks dokumen',
    clearSearch: 'Hapus pencarian',
    placeholder: 'Cari konsep, bukti, dan teks dokumen…',
    searchScope: 'Cakupan pencarian',
    everything: 'Semua',
    concepts: 'Konsep',
    sourceText: 'Teks sumber',
    clearFilters: (count: number) => `Hapus ${count} filter`,
    filters: 'Filter',
    hint: 'Ketik minimal 2 karakter. Pencarian berjalan pada proyek lokal; tidak ada penyedia AI yang terlibat.',
    reviewStatus: 'Status tinjauan konsep',
    anyStatus: 'Semua status',
    statusLabels: {
      confirmed: 'terkonfirmasi',
      suggested: 'disarankan',
      rejected: 'ditolak',
    },
    conceptTag: 'Tag konsep',
    anyTag: 'Semua tag',
    filterNote:
      'Filter status dan tag hanya berlaku untuk konsep. Hasil teks sumber selalu ditampilkan untuk kueri saat ini.',
    keepTyping: 'Lanjutkan mengetik',
    searchKnowledge: 'Cari pengetahuan Anda',
    keepTypingBody: 'Masukkan minimal dua karakter untuk mencari konsep dan seluruh teks dokumen.',
    searchKnowledgeBody:
      'Temukan konsep berdasarkan nama atau alias, atau cari frasa di dalam sumber PDF atau Markdown yang diimpor. Hasil menautkan kembali ke bagian yang tepat.',
    noMatches: 'Tidak ada kecocokan',
    noMatchesBody: (query: string, filtered: boolean) =>
      `Tidak ada yang cocok dengan “${query}” di proyek ini${filtered ? ' dengan filter saat ini' : ''}. Coba frasa yang lebih pendek, alias konsep, atau hapus filter.`,
    clearTheFilters: 'Hapus filter',
    results: (total: number, query: string, documentCount: number) =>
      `${total} hasil untuk “${query}”${
        documentCount > 0
          ? ` · ${documentCount} sumber dengan kecocokan teks`
          : ''
      }`,
    noDescription: 'Tanpa deskripsi.',
    sourceCount: (count: number) => `${count} sumber`,
    page: (page: number) => `halaman ${page}`,
    section: 'bagian',
    matchCount: (count: number) => `${count} kecocokan`,
    noConceptMatch:
      'Tidak ada label atau deskripsi konsep yang cocok. Teks sumber cocok, jadi pertimbangkan membuat konsep dari salah satu bagian ini.',
    filtersApply: 'Filter berlaku untuk pencarian konsep.',
    browseAll: 'Jelajahi semua konsep',
    relationshipTypes: (count: number) => `${count} tipe relasi didukung`,
  },
};

function queryParts(text: string, query: string): ReactNode[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [text];
  const haystack = text.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = haystack.indexOf(needle);
  let key = 0;
  while (index !== -1 && key < 20) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(
      <mark key={key} className="rounded-sm bg-cyan-400/20 px-0.5 text-cyan-100">
        {text.slice(index, index + needle.length)}
      </mark>,
    );
    key += 1;
    cursor = index + needle.length;
    index = haystack.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function makeSnippet(section: DocumentSection, text: string, query: string): string {
  const lower = text.toLowerCase();
  const index = lower.indexOf(query.toLowerCase());
  if (index === -1) return section.excerpt;
  const start = Math.max(0, index - 110);
  const end = Math.min(text.length, index + query.length + 170);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ')}${end < text.length ? '…' : ''}`;
}

function conceptSearchText(concept: Concept): string {
  return [concept.label, concept.aliases.join(' '), concept.description, concept.tags.join(' ')]
    .join(' ')
    .toLowerCase();
}

export function SearchPage() {
  const project = useWorkspaceStore((state) => state.activeProject);
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [scope, setScope] = useState<SearchScope>('all');
  const [status, setStatus] = useState<'all' | 'confirmed' | 'suggested' | 'rejected'>('all');
  const [tag, setTag] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const c = useCopy(copy);

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const updateQuery = (value: string) => {
    setQuery(value);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value.trim()) next.set('q', value);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  };

  const allTags = useMemo(
    () => [...new Set(project?.concepts.flatMap((concept) => concept.tags) ?? [])].sort(),
    [project],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const searchReady = normalizedQuery.length >= 2;

  const conceptResults = useMemo(() => {
    if (!project || !searchReady || scope === 'documents') return [];
    return project.concepts
      .filter((concept) => {
        if (status !== 'all' && concept.reviewStatus !== status) return false;
        if (tag !== 'all' && !concept.tags.includes(tag)) return false;
        return conceptSearchText(concept).includes(normalizedQuery);
      })
      .sort((a, b) => {
        const aLabel = a.label.toLowerCase().includes(normalizedQuery) ? 0 : 1;
        const bLabel = b.label.toLowerCase().includes(normalizedQuery) ? 0 : 1;
        return aLabel - bLabel || a.label.localeCompare(b.label);
      })
      .slice(0, 60);
  }, [project, searchReady, scope, normalizedQuery, status, tag]);

  const documentResults = useMemo(() => {
    if (!project || !searchReady || scope === 'concepts') return [] as DocumentMatch[];
    const matches: DocumentMatch[] = [];
    for (const document of project.documents) {
      if (matches.length >= 40) break;
      for (const section of document.sections) {
        const text = document.extractedText.slice(section.startOffset, section.endOffset);
        const count = text.toLowerCase().split(normalizedQuery).length - 1;
        if (count > 0) {
          matches.push({
            document,
            section,
            snippet: makeSnippet(section, text, normalizedQuery),
            occurrences: count,
          });
          if (matches.filter((match) => match.document.id === document.id).length >= 3) break;
        }
      }
    }
    return matches;
  }, [project, searchReady, scope, normalizedQuery]);

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader title={c.title} description={c.noProjectDescription} orb="search" />
        <NoProjectPanel />
      </div>
    );
  }

  const totalResults = conceptResults.length + documentResults.length;
  const documentCount = new Set(documentResults.map((match) => match.document.id)).size;
  const activeFilters = (status !== 'all' ? 1 : 0) + (tag !== 'all' ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.title}
        description={c.description}
        orb="search"
        actions={
          <Badge variant="outline">
            {c.badge(project.concepts.length, project.documents.length)}
          </Badge>
        }
      />

      <section aria-label={c.searchProject} className="surface rounded-xl p-4">
        <label className="relative block">
          <span className="sr-only">{c.searchLabel}</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          {query ? (
            <button
              type="button"
              aria-label={c.clearSearch}
              onClick={() => updateQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <Input
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder={c.placeholder}
            className="h-12 border-line pl-12 pr-10 text-sm"
            autoFocus
            aria-describedby="search-hint"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            label={c.searchScope}
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: c.everything },
              { value: 'concepts', label: c.concepts },
              { value: 'documents', label: c.sourceText },
            ]}
          />
          <div className="flex items-center gap-2">
            {activeFilters > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setStatus('all');
                  setTag('all');
                }}
                className="text-[10px] text-cyan-300 hover:text-cyan-200"
              >
                {c.clearFilters(activeFilters)}
              </button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Filter className="h-3.5 w-3.5" />}
              onClick={() => setFiltersOpen((current) => !current)}
              aria-expanded={filtersOpen}
            >
              {c.filters}
            </Button>
          </div>
        </div>
        <p id="search-hint" className="mt-2 text-[10px] text-slate-600">
          {c.hint}
        </p>

        {filtersOpen ? (
          <div className="mt-3 grid gap-3 rounded-lg border border-line-soft bg-[#0d0f14]/50 p-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500">
                {c.reviewStatus}
              </span>
              <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                <option value="all">{c.anyStatus}</option>
                <option value="confirmed">{c.statusLabels.confirmed}</option>
                <option value="suggested">{c.statusLabels.suggested}</option>
                <option value="rejected">{c.statusLabels.rejected}</option>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500">
                {c.conceptTag}
              </span>
              <Select value={tag} onChange={(event) => setTag(event.target.value)}>
                <option value="all">{c.anyTag}</option>
                {allTags.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </label>
            <p className="text-[10px] leading-relaxed text-slate-600 sm:col-span-2">
              {c.filterNote}
            </p>
          </div>
        ) : null}
      </section>

      {!searchReady ? (
        <div className="space-y-4">
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title={query ? c.keepTyping : c.searchKnowledge}
            description={
              query
                ? c.keepTypingBody
                : c.searchKnowledgeBody
            }
          />
          {allTags.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <Tag className="h-3 w-3 text-slate-600" />
              {allTags.slice(0, 12).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateQuery(option)}
                  className="rounded-md border border-line bg-white/[0.03] px-2 py-1 text-[10px] text-slate-400 hover:border-cyan-400/30 hover:text-cyan-200"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : totalResults === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title={c.noMatches}
          description={c.noMatchesBody(query.trim(), activeFilters > 0)}
          action={
            activeFilters > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setStatus('all');
                  setTag('all');
                }}
              >
                {c.clearTheFilters}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-7">
          <p className="text-[11px] text-slate-500">
            {c.results(totalResults, query.trim(), documentCount)}
          </p>

          {conceptResults.length > 0 ? (
            <section aria-labelledby="concept-results-heading">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                <h2 id="concept-results-heading" className="text-sm font-semibold text-bright">
                  {c.concepts}
                </h2>
                <Badge variant="outline">{conceptResults.length}</Badge>
              </div>
              <ul className="grid gap-2 md:grid-cols-2">
                {conceptResults.map((concept) => (
                  <li key={concept.id}>
                    <Link
                      to={`/concepts/${concept.id}`}
                      className="surface block h-full rounded-xl p-3.5 transition-colors hover:border-cyan-400/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-bright">
                          {queryParts(concept.label, normalizedQuery)}
                        </p>
                        <Badge
                          variant={
                            concept.reviewStatus === 'confirmed'
                              ? 'cyan'
                              : concept.reviewStatus === 'rejected'
                                ? 'rose'
                                : 'amber'
                          }
                        >
                          {c.statusLabels[concept.reviewStatus]}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                        {queryParts(
                          concept.description || concept.sourceReferences[0]?.excerpt || c.noDescription,
                          normalizedQuery,
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {concept.tags.slice(0, 3).map((conceptTag) => (
                          <span
                            key={conceptTag}
                            className="rounded border border-line px-1.5 py-0.5 text-[9px] text-slate-500"
                          >
                            {conceptTag}
                          </span>
                        ))}
                        <span className="ml-auto text-[9px] text-slate-600">
                          {c.sourceCount(concept.sourceReferences.length)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {documentResults.length > 0 ? (
            <section aria-labelledby="document-results-heading">
              <div className="mb-2 flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-violet-300" />
                <h2 id="document-results-heading" className="text-sm font-semibold text-bright">
                  {c.sourceText}
                </h2>
                <Badge variant="outline">{documentResults.length}</Badge>
              </div>
              <ul className="space-y-2">
                {documentResults.map((match) => (
                  <li key={`${match.document.id}-${match.section.id}`}>
                    <Link
                      to={`/documents/${match.document.id}?section=${match.section.id}&q=${encodeURIComponent(query.trim())}`}
                      className="surface block rounded-xl p-4 transition-colors hover:border-violet-400/30"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <p className="text-xs font-medium text-bright">{match.document.filename}</p>
                        <Badge variant="outline">
                          {match.section.pageNumber
                            ? c.page(match.section.pageNumber)
                            : match.section.heading ?? c.section}
                        </Badge>
                        <span className="text-[9px] text-slate-600">
                          {c.matchCount(match.occurrences)}
                        </span>
                        <span className="ml-auto text-[9px] text-slate-600">
                          {formatBytes(match.document.fileSize)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-400">
                        {queryParts(match.snippet, normalizedQuery)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      {searchReady && scope === 'all' && conceptResults.length === 0 && documentResults.length > 0 ? (
        <div className="rounded-xl border border-line-soft bg-white/[0.015] px-4 py-3 text-[11px] leading-relaxed text-slate-500">
          {c.noConceptMatch}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line-soft bg-white/[0.015] px-4 py-3 text-[10px] text-slate-600">
        <Filter className="h-3 w-3" />
        {c.filtersApply}
        <Link to="/universe?view=list" className={cn(buttonClassName('ghost', 'sm'), 'ml-auto')}>
          {c.browseAll}
        </Link>
        <span>{c.relationshipTypes(Object.keys(RELATION_TYPE_META).length)}</span>
      </div>
    </div>
  );
}
