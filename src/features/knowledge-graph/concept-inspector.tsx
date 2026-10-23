import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CircleSlash,
  GitBranch,
  Pencil,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { toast } from '@/app/toast-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getDirectRelationships } from '@/services/graph-engine/graph';
import { sourceHref, sourceLabel } from '@/features/documents/source-links';
import { formatDate, errorMessage } from '@/lib/utils';
import { useCopy } from '@/app/language-store';
import { useRelationMeta } from '@/app/relation-copy';
import { ConceptEditor } from './concept-editor';
import { RelationshipEditor } from './relationship-editor';

const copy = {
  en: {
    missingTitle: 'This concept no longer exists.',
    openUniverse: 'Open universe',
    also: 'Also:',
    updated: (date: string) => `Updated ${date}`,
    confidence: (percent: number) => ` · extraction confidence ${percent}%`,
    aiTitle: 'Unconfirmed AI suggestion.',
    aiBody:
      'Verify the quotation before relying on this concept. Confirming marks it as reviewed by you.',
    description: 'Description',
    noDescription: 'No description yet.',
    evidence: 'Source evidence',
    noSource:
      'No source attached. This concept is manual knowledge rather than a document-derived claim.',
    openEvidence: 'Open source evidence',
    removed: 'removed',
    noExcerpt: 'No excerpt stored.',
    relationships: 'Relationships',
    noRelationships:
      'No relationships yet. Connect a prerequisite, contrast, or example to give this concept a neighborhood.',
    provenance: 'Provenance',
    origin: 'Origin:',
    method: 'Method:',
    model: 'Model:',
    created: 'Created:',
    edit: 'Edit',
    connect: 'Connect',
    confirm: 'Confirm',
    reject: 'Reject',
    openInUniverse: 'Open in universe',
    confirmedTitle: 'Concept confirmed',
    confirmedBody: 'It is now marked as reviewed by you.',
    confirmError: 'Could not confirm the concept',
    rejectedTitle: 'Concept marked as rejected',
    rejectedBody: 'It remains in the project for auditability.',
    updateError: 'Could not update the concept',
    noEdgesTip:
      'Tip: a graph with no edges is harder to navigate. Add one relationship above.',
    rejectedNote:
      'This concept is marked rejected. It stays available for audit but can be filtered out in the universe.',
    statuses: {
      suggested: 'suggested',
      confirmed: 'confirmed',
      rejected: 'rejected',
    },
  },
  id: {
    missingTitle: 'Konsep ini sudah tidak ada.',
    openUniverse: 'Buka semesta',
    also: 'Juga:',
    updated: (date: string) => `Diperbarui ${date}`,
    confidence: (percent: number) => ` · keyakinan ekstraksi ${percent}%`,
    aiTitle: 'Saran AI yang belum dikonfirmasi.',
    aiBody:
      'Verifikasi kutipan sebelum mengandalkan konsep ini. Mengonfirmasi menandainya sebagai telah Anda tinjau.',
    description: 'Deskripsi',
    noDescription: 'Belum ada deskripsi.',
    evidence: 'Bukti sumber',
    noSource:
      'Tidak ada sumber terlampir. Konsep ini adalah pengetahuan manual, bukan klaim turunan dokumen.',
    openEvidence: 'Buka bukti sumber',
    removed: 'dihapus',
    noExcerpt: 'Tidak ada kutipan tersimpan.',
    relationships: 'Relasi',
    noRelationships:
      'Belum ada relasi. Hubungkan prasyarat, kontras, atau contoh untuk memberi konsep ini lingkungan.',
    provenance: 'Provenans',
    origin: 'Asal:',
    method: 'Metode:',
    model: 'Model:',
    created: 'Dibuat:',
    edit: 'Edit',
    connect: 'Hubungkan',
    confirm: 'Konfirmasi',
    reject: 'Tolak',
    openInUniverse: 'Buka di semesta',
    confirmedTitle: 'Konsep dikonfirmasi',
    confirmedBody: 'Konsep kini ditandai sebagai telah Anda tinjau.',
    confirmError: 'Tidak dapat mengonfirmasi konsep',
    rejectedTitle: 'Konsep ditandai ditolak',
    rejectedBody: 'Konsep tetap ada di proyek untuk keterlacakan.',
    updateError: 'Tidak dapat memperbarui konsep',
    noEdgesTip:
      'Tip: graf tanpa tepi lebih sulit dinavigasi. Tambahkan satu relasi di atas.',
    rejectedNote:
      'Konsep ini ditandai ditolak. Tetap tersedia untuk audit tetapi dapat disaring di semesta.',
    statuses: {
      suggested: 'disarankan',
      confirmed: 'dikonfirmasi',
      rejected: 'ditolak',
    },
  },
} as const;

export function ConceptInspector({
  conceptId,
  onSelectConcept,
  className,
}: {
  conceptId: string;
  onSelectConcept?: (conceptId: string) => void;
  className?: string;
}) {
  const c = useCopy(copy);
  const relationMeta = useRelationMeta();
  const navigate = useNavigate();
  const project = useWorkspaceStore((state) => state.activeProject);
  const updateConcept = useWorkspaceStore((state) => state.updateConcept);
  const [editOpen, setEditOpen] = useState(false);
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const concept = project?.concepts.find((candidate) => candidate.id === conceptId);
  const documents = useMemo(
    () => new Map(project?.documents.map((document) => [document.id, document]) ?? []),
    [project],
  );
  const relationships = useMemo(
    () => (project ? getDirectRelationships(project, conceptId) : []),
    [project, conceptId],
  );

  if (!project) return null;
  if (!concept) {
    return (
      <div className={className}>
        <div className="surface rounded-xl p-5">
          <p className="text-sm text-slate-400">{c.missingTitle}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/universe')}>
            {c.openUniverse}
          </Button>
        </div>
      </div>
    );
  }

  const select = (id: string) => {
    if (onSelectConcept) onSelectConcept(id);
    else navigate(`/concepts/${id}`);
  };

  const isAiSuggestion = concept.provenance.origin === 'ai' && concept.reviewStatus !== 'confirmed';

  return (
    <div className={className}>
      <div className="surface overflow-hidden rounded-xl">
        <div className="border-b border-line-soft p-5">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <Badge variant={concept.reviewStatus === 'confirmed' ? 'cyan' : concept.reviewStatus === 'rejected' ? 'rose' : 'amber'}>
              {c.statuses[concept.reviewStatus]}
            </Badge>
            <Badge variant={concept.provenance.origin === 'ai' ? 'violet' : 'outline'}>
              {concept.provenance.origin.replaceAll('-', ' ')}
            </Badge>
            {concept.provenance.model ? (
              <Badge variant="outline" className="normal-case tracking-normal">
                {concept.provenance.model}
              </Badge>
            ) : null}
          </div>
          <h2 className="text-xl font-semibold leading-tight tracking-[-0.02em] text-bright">
            {concept.label}
          </h2>
          {concept.aliases.length > 0 ? (
            <p className="mt-1.5 text-xs text-slate-500">{c.also} {concept.aliases.join(' · ')}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {concept.tags.map((tag) => (
              <Link
                key={tag}
                to={`/universe?tag=${encodeURIComponent(tag)}&view=list`}
                className="rounded-md border border-line bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400 hover:border-slate-500/60 hover:text-slate-200"
              >
                {tag}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            {c.updated(formatDate(concept.updatedAt, true))}
            {concept.confidence !== undefined
              ? c.confidence(Math.round(concept.confidence * 100))
              : ''}
          </p>
        </div>

        {isAiSuggestion ? (
          <div className="border-b border-violet-400/15 bg-violet-400/[0.05] px-5 py-3 text-[11px] leading-relaxed text-violet-100/90">
            <span className="font-semibold">{c.aiTitle}</span> {c.aiBody}
          </div>
        ) : null}

        <div className="space-y-5 p-5">
          <section aria-labelledby="inspector-description">
            <h3 id="inspector-description" className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {c.description}
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {concept.description || c.noDescription}
            </p>
          </section>

          <section aria-labelledby="inspector-evidence">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 id="inspector-evidence" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {c.evidence}
              </h3>
              <Badge variant="outline">{concept.sourceReferences.length}</Badge>
            </div>
            {concept.sourceReferences.length === 0 ? (
              <p className="text-xs leading-relaxed text-slate-500">
                {c.noSource}
              </p>
            ) : (
              <ul className="space-y-2">
                {concept.sourceReferences.map((reference) => {
                  const document = documents.get(reference.documentId);
                  const href = sourceHref(reference, document);
                  return (
                    <li key={reference.id} className="rounded-lg border border-line-soft bg-[#0d0f14]/55 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-200">
                          <BookOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {sourceLabel(reference, document)}
                        </p>
                        {document ? (
                          <Link
                            to={href}
                            className="shrink-0 rounded p-1 text-slate-500 hover:text-cyan-200"
                            aria-label={c.openEvidence}
                            title={c.openEvidence}
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <Badge variant="rose">{c.removed}</Badge>
                        )}
                      </div>
                      <blockquote className="mt-1.5 line-clamp-4 border-l border-violet-400/30 pl-2 text-[11px] leading-relaxed text-slate-400">
                        {reference.excerpt || c.noExcerpt}
                      </blockquote>
                      <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-600">
                        {reference.extractionMethod}
                        {reference.startOffset !== undefined && reference.endOffset !== undefined
                          ? ` · chars ${reference.startOffset}–${reference.endOffset}`
                          : ''}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="inspector-related">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 id="inspector-related" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {c.relationships}
              </h3>
              <Badge variant="outline">{relationships.length}</Badge>
            </div>
            {relationships.length === 0 ? (
              <p className="text-xs leading-relaxed text-slate-500">
                {c.noRelationships}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {relationships.map((relationship) => {
                  const outgoing = relationship.sourceConceptId === concept.id;
                  const otherId = outgoing ? relationship.targetConceptId : relationship.sourceConceptId;
                  const other = project.concepts.find((candidate) => candidate.id === otherId);
                  if (!other) return null;
                  const meta = relationMeta[relationship.relationType];
                  return (
                    <li key={relationship.id}>
                      <button
                        type="button"
                        onClick={() => select(other.id)}
                        className="w-full rounded-lg border border-line-soft bg-white/[0.02] px-3 py-2 text-left transition-colors hover:border-slate-500/60 hover:bg-white/[0.04]"
                      >
                        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                          {outgoing ? meta.label : meta.inverseLabel}
                          <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-slate-200">{other.label}</span>
                          {relationship.reviewStatus !== 'confirmed' ? (
                            <Badge variant="amber">{c.statuses[relationship.reviewStatus]}</Badge>
                          ) : null}
                        </span>
                        {relationship.explanation ? (
                          <span className="mt-1 line-clamp-2 block text-[10px] leading-relaxed text-slate-500">
                            {relationship.explanation}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="inspector-provenance">
            <h3 id="inspector-provenance" className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {c.provenance}
            </h3>
            <div className="space-y-1 rounded-lg border border-line-soft bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
              <p>
                {c.origin} <span className="text-slate-300">{concept.provenance.origin.replaceAll('-', ' ')}</span>
              </p>
              {concept.provenance.method ? (
                <p>
                  {c.method} <span className="text-slate-300">{concept.provenance.method}</span>
                </p>
              ) : null}
              {concept.provenance.model ? (
                <p>
                  {c.model} <span className="text-slate-300">{concept.provenance.model}</span>
                </p>
              ) : null}
              <p>
                {c.created} <span className="text-slate-300">{formatDate(concept.createdAt)}</span>
              </p>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line-soft p-4">
          <Button variant="secondary" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditOpen(true)}>
            {c.edit}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setRelationshipOpen(true)}
          >
            {c.connect}
          </Button>
          {concept.reviewStatus !== 'confirmed' ? (
            <Button
              variant="ghost"
              size="sm"
              loading={confirming}
              leftIcon={<Check className="h-3.5 w-3.5" />}
              onClick={async () => {
                setConfirming(true);
                try {
                  await updateConcept(concept.id, { reviewStatus: 'confirmed' });
                  toast.success(c.confirmedTitle, c.confirmedBody);
                } catch (error) {
                  toast.error(c.confirmError, errorMessage(error));
                } finally {
                  setConfirming(false);
                }
              }}
            >
              {c.confirm}
            </Button>
          ) : null}
          {concept.reviewStatus !== 'rejected' ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<CircleSlash className="h-3.5 w-3.5" />}
              onClick={async () => {
                try {
                  await updateConcept(concept.id, { reviewStatus: 'rejected' });
                  toast.info(c.rejectedTitle, c.rejectedBody);
                } catch (error) {
                  toast.error(c.updateError, errorMessage(error));
                }
              }}
            >
              {c.reject}
            </Button>
          ) : null}
          {!onSelectConcept ? (
            <Link
              to={`/universe?focus=${concept.id}`}
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200"
            >
              <Sparkles className="h-3 w-3" /> {c.openInUniverse}
            </Link>
          ) : null}
        </div>
      </div>

      {relationships.length === 0 && concept.sourceReferences.length > 0 ? (
        <p className="mt-2 flex items-center gap-1.5 text-[10px] leading-relaxed text-slate-600">
          <GitBranch className="h-3 w-3" /> {c.noEdgesTip}
        </p>
      ) : null}
      {concept.reviewStatus === 'rejected' ? (
        <p className="mt-2 text-[10px] leading-relaxed text-rose-300/80">
          {c.rejectedNote}
        </p>
      ) : null}

      <ConceptEditor open={editOpen} onClose={() => setEditOpen(false)} concept={concept} />
      <RelationshipEditor
        open={relationshipOpen}
        onClose={() => setRelationshipOpen(false)}
        defaultSourceId={concept.id}
      />
    </div>
  );
}
