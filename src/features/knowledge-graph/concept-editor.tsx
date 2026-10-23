import { useEffect, useMemo, useState } from 'react';
import { Link2, Plus, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { toast } from '@/app/toast-store';
import { Dialog, ConfirmDialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Notice } from '@/components/ui/states';
import { createSourceReference } from '@/core/domain/factory';
import type { Concept, SourceReference } from '@/core/domain/types';
import { findDuplicateCandidates } from '@/services/graph-engine/graph';
import { sourceLabel } from '@/features/documents/source-links';
import { errorMessage } from '@/lib/utils';
import { useCopy } from '@/app/language-store';

const copy = {
  en: {
    chooseSection: 'Choose a document section first',
    sectionAttached: 'That section is already attached',
    conceptUpdated: 'Concept updated',
    conceptAdded: 'Concept added',
    conceptAddedBody: 'Attach a relationship from the inspector to connect it.',
    saveError: 'Could not save the concept',
    editTitle: 'Edit concept',
    createTitle: 'Create concept',
    dialogDescription:
      'Concepts can exist without AI. Attach a verified page or section so the evidence stays inspectable.',
    delete: 'Delete',
    cancel: 'Cancel',
    saveChanges: 'Save changes',
    createConcept: 'Create concept',
    label: 'Label',
    labelPlaceholder: 'e.g. Opportunity cost',
    duplicateTitle: 'Possible duplicate',
    duplicateWarning: (names: string) =>
      `${names} already exist in this project. Consider adding an alias or editing the existing concept instead.`,
    descriptionLabel: 'Description',
    descriptionHint:
      'Write your own explanation or accept an AI-paraphrased one after review.',
    descriptionPlaceholder: 'What does this concept mean, and why does it matter?',
    aliasesLabel: 'Aliases',
    aliasesHint: 'Comma-separated alternative names.',
    aliasesPlaceholder: 'opportunity costs, shadow price',
    tagsLabel: 'Tags',
    tagsHint: 'Tags group concepts into 3D regions.',
    tagsPlaceholder: 'Economics, Decision making',
    sourceReferences: 'Source references',
    removeSourceReference: 'Remove source reference',
    noSourceAttached:
      'No source attached. The concept is still valid, but its claims will not be traceable to a document.',
    sourceDocument: 'Source document',
    sourceSection: 'Source section',
    page: (pageNumber: number) => `Page ${pageNumber}`,
    section: (headingLevel: number | undefined) => `Section ${headingLevel ?? ''}`,
    attach: 'Attach',
    importDocument: 'Import a document to attach page or section evidence.',
    provenance: (origin: string, status: string, model?: string) =>
      `Provenance: ${origin} · ${status}${model ? ` · ${model}` : ''}. Saving this edit marks the concept as user-confirmed.`,
    manualProvenance:
      'Created manually with user provenance. Nothing is sent to an AI provider.',
    deleteTitle: (label: string) => `Delete "${label}"?`,    deleteDescription:
      'This removes the concept, its relationships, and its learning record. Source documents and extracted text stay in the project.',
    concept: 'concept',
    deleteConfirm: 'Delete concept',
    conceptDeleted: 'Concept deleted',
    conceptDeletedBody: 'Relationships and learning records for it were removed.',
    deleteError: 'Could not delete the concept',
    origins: {
      user: 'user',
      'document-structure': 'document structure',
      ai: 'ai',
      imported: 'imported',
    },
    statuses: {
      suggested: 'suggested',
      confirmed: 'confirmed',
      rejected: 'rejected',
    },
  },
  id: {
    chooseSection: 'Pilih bagian dokumen terlebih dahulu',
    sectionAttached: 'Bagian tersebut sudah dilampirkan',
    conceptUpdated: 'Konsep diperbarui',
    conceptAdded: 'Konsep ditambahkan',
    conceptAddedBody: 'Lampirkan relasi dari inspektur untuk menghubungkannya.',
    saveError: 'Tidak dapat menyimpan konsep',
    editTitle: 'Edit konsep',
    createTitle: 'Buat konsep',
    dialogDescription:
      'Konsep dapat dibuat tanpa AI. Lampirkan halaman atau bagian yang terverifikasi agar buktinya tetap dapat diperiksa.',
    delete: 'Hapus',
    cancel: 'Batal',
    saveChanges: 'Simpan perubahan',
    createConcept: 'Buat konsep',
    label: 'Label',
    labelPlaceholder: 'mis. Biaya peluang',
    duplicateTitle: 'Kemungkinan duplikat',
    duplicateWarning: (names: string) =>
      `${names} sudah ada di proyek ini. Pertimbangkan menambahkan alias atau mengedit konsep yang ada.`,
    descriptionLabel: 'Deskripsi',
    descriptionHint:
      'Tulis penjelasan Anda sendiri atau terima parafrase AI setelah ditinjau.',
    descriptionPlaceholder: 'Apa arti konsep ini, dan mengapa penting?',
    aliasesLabel: 'Alias',
    aliasesHint: 'Nama alternatif dipisahkan koma.',
    aliasesPlaceholder: 'biaya peluang, harga bayangan',
    tagsLabel: 'Tag',
    tagsHint: 'Tag mengelompokkan konsep ke wilayah 3D.',
    tagsPlaceholder: 'Ekonomi, Pengambilan keputusan',
    sourceReferences: 'Referensi sumber',
    removeSourceReference: 'Hapus referensi sumber',
    noSourceAttached:
      'Belum ada sumber terlampir. Konsep tetap valid, tetapi klaimnya tidak dapat ditelusuri ke dokumen.',
    sourceDocument: 'Dokumen sumber',
    sourceSection: 'Bagian sumber',
    page: (pageNumber: number) => `Halaman ${pageNumber}`,
    section: (headingLevel: number | undefined) => `Bagian ${headingLevel ?? ''}`,
    attach: 'Lampirkan',
    importDocument: 'Impor dokumen untuk melampirkan bukti halaman atau bagian.',
    provenance: (origin: string, status: string, model?: string) =>
      `Provenans: ${origin} · ${status}${model ? ` · ${model}` : ''}. Menyimpan editan ini menandai konsep sebagai dikonfirmasi pengguna.`,
    manualProvenance:
      'Dibuat secara manual dengan provenans pengguna. Tidak ada yang dikirim ke penyedia AI.',
    deleteTitle: (label: string) => `Hapus "${label}"?`,
    deleteDescription:
      'Ini menghapus konsep, relasinya, dan catatan pembelajarannya. Dokumen sumber dan teks yang diekstrak tetap ada di proyek.',
    concept: 'konsep',
    deleteConfirm: 'Hapus konsep',
    conceptDeleted: 'Konsep dihapus',
    conceptDeletedBody: 'Relasi dan catatan pembelajaran untuk konsep ini telah dihapus.',
    deleteError: 'Tidak dapat menghapus konsep',
    origins: {
      user: 'pengguna',
      'document-structure': 'struktur dokumen',
      ai: 'AI',
      imported: 'impor',
    },
    statuses: {
      suggested: 'disarankan',
      confirmed: 'dikonfirmasi',
      rejected: 'ditolak',
    },
  },
} as const;

export function ConceptEditor({
  open,
  onClose,
  concept,
  defaultDocumentId,
  defaultSectionId,
}: {
  open: boolean;
  onClose: () => void;
  concept?: Concept | null;
  defaultDocumentId?: string;
  defaultSectionId?: string;
}) {
  const project = useWorkspaceStore((state) => state.activeProject);
  const addConcept = useWorkspaceStore((state) => state.addConcept);
  const updateConcept = useWorkspaceStore((state) => state.updateConcept);
  const deleteConcept = useWorkspaceStore((state) => state.deleteConcept);
  const c = useCopy(copy);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [aliases, setAliases] = useState('');
  const [tags, setTags] = useState('');
  const [references, setReferences] = useState<SourceReference[]>([]);
  const [documentId, setDocumentId] = useState(defaultDocumentId ?? '');
  const [sectionId, setSectionId] = useState(defaultSectionId ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel(concept?.label ?? '');
    setDescription(concept?.description ?? '');
    setAliases(concept?.aliases.join(', ') ?? '');
    setTags(concept?.tags.join(', ') ?? '');
    setReferences(concept?.sourceReferences ?? []);
    const fallbackDoc =
      defaultDocumentId ??
      concept?.sourceReferences[0]?.documentId ??
      project?.documents[0]?.id ??
      '';
    setDocumentId(fallbackDoc);
    const firstSection =
      defaultSectionId ??
      (fallbackDoc
        ? project?.documents.find((document) => document.id === fallbackDoc)?.sections[0]?.id
        : undefined);
    setSectionId(firstSection ?? '');
  }, [open, concept, defaultDocumentId, defaultSectionId, project]);

  const document = project?.documents.find((candidate) => candidate.id === documentId);
  const duplicateCandidates = useMemo(() => {
    if (!project || !label.trim()) return [];
    return findDuplicateCandidates(project, label, concept?.id);
  }, [project, label, concept]);

  const addReference = () => {
    const section = document?.sections.find((candidate) => candidate.id === sectionId);
    if (!document || !section) {
      toast.info(c.chooseSection);
      return;
    }
    if (references.some((reference) => reference.startOffset === section.startOffset && reference.documentId === document.id)) {
      toast.info(c.sectionAttached);
      return;
    }
    setReferences((current) => [
      ...current,
      createSourceReference({
        documentId: document.id,
        ...(section.pageNumber !== undefined ? { pageNumber: section.pageNumber } : {}),
        ...(section.heading ? { sectionHeading: section.heading } : {}),
        startOffset: section.startOffset,
        endOffset: section.endOffset,
        excerpt: section.excerpt,
        extractionMethod: document.extractionMethod === 'pdf-text' ? 'pdf-text' : 'markdown-heading',
      }),
    ]);
  };

  const submit = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      const input = {
        label,
        description,
        aliases: aliases.split(',').map((value) => value.trim()).filter(Boolean),
        tags: tags.split(',').map((value) => value.trim()).filter(Boolean),
        sourceReferences: references,
      };
      if (concept) {
        await updateConcept(concept.id, {
          ...input,
          reviewStatus: 'confirmed',
        });
        toast.success(c.conceptUpdated);
      } else {
        await addConcept(input);
        toast.success(c.conceptAdded, c.conceptAddedBody);
      }
      onClose();
    } catch (error) {
      toast.error(c.saveError, errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (!project) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={concept ? c.editTitle : c.createTitle}
        description={c.dialogDescription}
        size="lg"
        footer={
          <>
            {concept ? (
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
              disabled={!label.trim()}
            >
              {concept ? c.saveChanges : c.createConcept}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={c.label} htmlFor="concept-label" required>
            <Input
              id="concept-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={300}
              placeholder={c.labelPlaceholder}
              autoFocus
            />
          </Field>
          {duplicateCandidates.length > 0 ? (
            <Notice tone="warning" title={c.duplicateTitle}>
              {c.duplicateWarning(
                duplicateCandidates
                  .slice(0, 3)
                  .map((candidate) => candidate.label)
                  .join(', '),
              )}
            </Notice>
          ) : null}
          <Field
            label={c.descriptionLabel}
            htmlFor="concept-description"
            hint={c.descriptionHint}
          >
            <Textarea
              id="concept-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={20_000}
              rows={4}
              placeholder={c.descriptionPlaceholder}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.aliasesLabel} htmlFor="concept-aliases" hint={c.aliasesHint}>
              <Input
                id="concept-aliases"
                value={aliases}
                onChange={(event) => setAliases(event.target.value)}
                placeholder={c.aliasesPlaceholder}
              />
            </Field>
            <Field label={c.tagsLabel} htmlFor="concept-tags" hint={c.tagsHint}>
              <Input
                id="concept-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder={c.tagsPlaceholder}
                list="concept-tag-suggestions"
              />
              <datalist id="concept-tag-suggestions">
                {[...new Set(project.concepts.flatMap((candidate) => candidate.tags))].map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="rounded-xl border border-line-soft bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Link2 className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
              {c.sourceReferences}
              <Badge variant="outline">{references.length}</Badge>
            </div>
            {references.length > 0 ? (
              <ul className="mb-3 space-y-2">
                {references.map((reference) => {
                  const sourceDocument = project.documents.find(
                    (candidate) => candidate.id === reference.documentId,
                  );
                  return (
                    <li
                      key={reference.id}
                      className="flex items-start gap-2 rounded-lg border border-line-soft bg-[#0d0f14]/60 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-slate-300">
                          {sourceLabel(reference, sourceDocument)}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                          {reference.excerpt}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded p-1 text-slate-500 hover:text-rose-300"
                        onClick={() =>
                          setReferences((current) =>
                            current.filter((candidate) => candidate.id !== reference.id),
                          )
                        }
                        aria-label={c.removeSourceReference}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
                {c.noSourceAttached}
              </p>
            )}
            {project.documents.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Select
                  aria-label={c.sourceDocument}
                  value={documentId}
                  onChange={(event) => {
                    setDocumentId(event.target.value);
                    const next = project.documents.find(
                      (candidate) => candidate.id === event.target.value,
                    );
                    setSectionId(next?.sections[0]?.id ?? '');
                  }}
                >
                  {project.documents.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.filename}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label={c.sourceSection}
                  value={sectionId}
                  onChange={(event) => setSectionId(event.target.value)}
                >
                  {(document?.sections ?? []).map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.pageNumber
                        ? c.page(section.pageNumber)
                        : section.heading ?? c.section(section.headingLevel)}
                    </option>
                  ))}
                </Select>
                <Button variant="secondary" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addReference}>
                  {c.attach}
                </Button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                {c.importDocument}
              </p>
            )}
          </div>

          {concept ? (
            <p className="text-[11px] text-slate-500">
              {c.provenance(
                c.origins[concept.provenance.origin],
                c.statuses[concept.provenance.status],
                concept.provenance.model,
              )}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">
              {c.manualProvenance}
            </p>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!concept) return;
          setDeleting(true);
          try {
            await deleteConcept(concept.id);
            toast.success(c.conceptDeleted, c.conceptDeletedBody);
            setConfirmDelete(false);
            onClose();
          } catch (error) {
            toast.error(c.deleteError, errorMessage(error));
          } finally {
            setDeleting(false);
          }
        }}
        title={c.deleteTitle(concept?.label ?? c.concept)}
        description={c.deleteDescription}
        confirmLabel={c.deleteConfirm}
        destructive
        loading={deleting}
      />
    </>
  );
}
