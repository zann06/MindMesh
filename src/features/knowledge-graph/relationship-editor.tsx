import { useEffect, useState } from 'react';
import { ArrowRight, GitBranch, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { toast } from '@/app/toast-store';
import { Dialog, ConfirmDialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Select, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/states';
import { Badge } from '@/components/ui/badge';
import type { Relationship, RelationType } from '@/core/domain/types';
import { RELATION_TYPES } from '@/core/domain/types';
import { useCopy } from '@/app/language-store';
import { useRelationMeta } from '@/app/relation-copy';
import { errorMessage } from '@/lib/utils';

const copy = {
  en: {
    editTitle: 'Edit relationship',
    createTitle: 'Connect concepts',
    dialogDescription:
      'Relationship type determines direction. Explanations are shown in the inspector and quiz feedback.',
    delete: 'Delete',
    cancel: 'Cancel',
    saveChanges: 'Save changes',
    addRelationship: 'Add relationship',
    sourceConcept: 'Source concept',
    targetConcept: 'Target concept',
    relationshipType: 'Relationship type',
    directional: 'directional',
    undirected: 'undirected',
    explanation: 'Explanation',
    explanationHint: 'Optional, but useful during review and revision.',
    explanationPlaceholder: 'Why are these concepts connected?',
    selfError: 'A concept cannot relate to itself.',
    inheritNote:
      'Source references are inherited from the two concepts when available. Edit a concept to adjust its evidence.',
    source: 'Source',
    target: 'Target',
    updated: 'Relationship updated',
    added: 'Relationship added',
    saveError: 'Could not save the relationship',
    deleteTitle: 'Delete this relationship?',
    deleteDescription: 'The concepts and their source references are not deleted.',
    deleteConfirm: 'Delete relationship',
    deleted: 'Relationship deleted',
    deleteError: 'Could not delete the relationship',
  },
  id: {
    editTitle: 'Edit relasi',
    createTitle: 'Hubungkan konsep',
    dialogDescription:
      'Jenis relasi menentukan arah. Penjelasan ditampilkan di inspektur dan umpan balik kuis.',
    delete: 'Hapus',
    cancel: 'Batal',
    saveChanges: 'Simpan perubahan',
    addRelationship: 'Tambah relasi',
    sourceConcept: 'Konsep sumber',
    targetConcept: 'Konsep tujuan',
    relationshipType: 'Jenis relasi',
    directional: 'berarah',
    undirected: 'tak berarah',
    explanation: 'Penjelasan',
    explanationHint: 'Opsional, tetapi berguna saat meninjau dan mengulang.',
    explanationPlaceholder: 'Mengapa konsep-konsep ini terhubung?',
    selfError: 'Konsep tidak dapat berelasi dengan dirinya sendiri.',
    inheritNote:
      'Referensi sumber diwarisi dari kedua konsep bila tersedia. Edit konsep untuk menyesuaikan buktinya.',
    source: 'Sumber',
    target: 'Tujuan',
    updated: 'Relasi diperbarui',
    added: 'Relasi ditambahkan',
    saveError: 'Tidak dapat menyimpan relasi',
    deleteTitle: 'Hapus relasi ini?',
    deleteDescription: 'Konsep dan referensi sumbernya tidak dihapus.',
    deleteConfirm: 'Hapus relasi',
    deleted: 'Relasi dihapus',
    deleteError: 'Tidak dapat menghapus relasi',
  },
} as const;

export function RelationshipEditor({
  open,
  onClose,
  relationship,
  defaultSourceId,
  defaultTargetId,
}: {
  open: boolean;
  onClose: () => void;
  relationship?: Relationship | null;
  defaultSourceId?: string;
  defaultTargetId?: string;
}) {
  const c = useCopy(copy);
  const relationMeta = useRelationMeta();
  const project = useWorkspaceStore((state) => state.activeProject);
  const addRelationship = useWorkspaceStore((state) => state.addRelationship);
  const updateRelationship = useWorkspaceStore((state) => state.updateRelationship);
  const deleteRelationship = useWorkspaceStore((state) => state.deleteRelationship);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('related-to');
  const [explanation, setExplanation] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSourceId(relationship?.sourceConceptId ?? defaultSourceId ?? project?.concepts[0]?.id ?? '');
    setTargetId(
      relationship?.targetConceptId ??
        defaultTargetId ??
        project?.concepts.find((concept) => concept.id !== defaultSourceId)?.id ??
        '',
    );
    setRelationType(relationship?.relationType ?? 'related-to');
    setExplanation(relationship?.explanation ?? '');
  }, [open, relationship, defaultSourceId, defaultTargetId, project]);

  if (!project) return null;
  const meta = relationMeta[relationType];
  const source = project.concepts.find((concept) => concept.id === sourceId);
  const target = project.concepts.find((concept) => concept.id === targetId);

  const submit = async () => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setSaving(true);
    try {
      const references = [
        ...(project.concepts.find((concept) => concept.id === sourceId)?.sourceReferences ?? []),
        ...(project.concepts.find((concept) => concept.id === targetId)?.sourceReferences ?? []),
      ]
        .filter(
          (reference, index, all) =>
            all.findIndex(
              (candidate) =>
                candidate.documentId === reference.documentId &&
                candidate.startOffset === reference.startOffset &&
                candidate.excerpt === reference.excerpt,
            ) === index,
        )
        .slice(0, 2);
      if (relationship) {
        await updateRelationship(relationship.id, {
          sourceConceptId: sourceId,
          targetConceptId: targetId,
          relationType,
          explanation,
          sourceReferences: references,
          reviewStatus: 'confirmed',
        });
        toast.success(c.updated);
      } else {
        await addRelationship({
          sourceConceptId: sourceId,
          targetConceptId: targetId,
          relationType,
          explanation,
          sourceReferences: references,
        });
        toast.success(c.added);
      }
      onClose();
    } catch (error) {
      toast.error(c.saveError, errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={relationship ? c.editTitle : c.createTitle}
        description={c.dialogDescription}
        size="md"
        footer={
          <>
            {relationship ? (
              <Button
                variant="danger"
                className="mr-auto"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfirmDelete(true)}
              >
                {c.delete}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              {c.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              loading={saving}
              disabled={!sourceId || !targetId || sourceId === targetId}
            >
              {relationship ? c.saveChanges : c.addRelationship}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <Field label={c.sourceConcept} htmlFor="relationship-source">
              <Select
                id="relationship-source"
                value={sourceId}
                onChange={(event) => setSourceId(event.target.value)}
                autoFocus
              >
                {project.concepts.map((concept) => (
                  <option key={concept.id} value={concept.id}>
                    {concept.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="hidden pb-2.5 text-slate-500 sm:block">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </div>
            <Field label={c.targetConcept} htmlFor="relationship-target">
              <Select
                id="relationship-target"
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
              >
                {project.concepts.map((concept) => (
                  <option key={concept.id} value={concept.id}>
                    {concept.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={c.relationshipType} htmlFor="relationship-type">
            <Select
              id="relationship-type"
              value={relationType}
              onChange={(event) => setRelationType(event.target.value as RelationType)}
            >
              {RELATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {relationMeta[type].label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-start gap-2 rounded-lg border border-line-soft bg-white/[0.02] px-3 py-2.5">
            <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" aria-hidden="true" />
            <div className="text-[11px] leading-relaxed text-slate-400">
              <p>{meta.description}</p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5">
                <span>{source?.label ?? c.source}</span>
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
                <span>{target?.label ?? c.target}</span>
                <Badge variant={meta.directional ? 'cyan' : 'violet'}>
                  {meta.directional ? c.directional : c.undirected}
                </Badge>
              </p>
            </div>
          </div>

          <Field
            label={c.explanation}
            htmlFor="relationship-explanation"
            hint={c.explanationHint}
          >
            <Textarea
              id="relationship-explanation"
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              rows={3}
              maxLength={20_000}
              placeholder={c.explanationPlaceholder}
            />
          </Field>

          {sourceId === targetId ? (
            <Notice tone="error">{c.selfError}</Notice>
          ) : null}
          <p className="text-[11px] leading-relaxed text-slate-500">
            {c.inheritNote}
          </p>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!relationship) return;
          setDeleting(true);
          try {
            await deleteRelationship(relationship.id);
            toast.success(c.deleted);
            setConfirmDelete(false);
            onClose();
          } catch (error) {
            toast.error(c.deleteError, errorMessage(error));
          } finally {
            setDeleting(false);
          }
        }}
        title={c.deleteTitle}
        description={c.deleteDescription}
        confirmLabel={c.deleteConfirm}
        destructive
        loading={deleting}
      />
    </>
  );
}
