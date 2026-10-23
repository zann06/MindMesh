import { getLanguage, useLanguageStore, type CopyMap, type Language, type Widen } from './language-store';
import {
  RELATION_TYPE_META,
  type RelationType,
  type RelationTypeMeta,
} from '@/core/domain/types';

const copy = {
  en: {
    prerequisite: {
      label: 'Prerequisite',
      inverseLabel: 'Requires',
      description: 'The source concept is needed to understand the target concept.',
    },
    'part-of': {
      label: 'Part of',
      inverseLabel: 'Contains',
      description: 'The source concept is a component of the target concept.',
    },
    'related-to': {
      label: 'Related to',
      inverseLabel: 'Related to',
      description: 'A general association without an implied direction.',
    },
    'contrasts-with': {
      label: 'Contrasts with',
      inverseLabel: 'Contrasts with',
      description: 'The concepts are meaningfully opposed or commonly confused.',
    },
    causes: {
      label: 'Causes',
      inverseLabel: 'Caused by',
      description: 'The source concept brings about the target concept or outcome.',
    },
    'example-of': {
      label: 'Example of',
      inverseLabel: 'Exemplified by',
      description: 'The source concept is a specific example of the target concept.',
    },
  },
  id: {
    prerequisite: {
      label: 'Prasyarat',
      inverseLabel: 'Membutuhkan',
      description: 'Konsep sumber diperlukan untuk memahami konsep tujuan.',
    },
    'part-of': {
      label: 'Bagian dari',
      inverseLabel: 'Berisi',
      description: 'Konsep sumber adalah komponen dari konsep tujuan.',
    },
    'related-to': {
      label: 'Terkait dengan',
      inverseLabel: 'Terkait dengan',
      description: 'Asosiasi umum tanpa arah yang tersirat.',
    },
    'contrasts-with': {
      label: 'Berlawanan dengan',
      inverseLabel: 'Berlawanan dengan',
      description: 'Konsep-konsep ini bertentangan secara bermakna atau sering tertukar.',
    },
    causes: {
      label: 'Menyebabkan',
      inverseLabel: 'Disebabkan oleh',
      description: 'Konsep sumber memunculkan konsep atau hasil tujuan.',
    },
    'example-of': {
      label: 'Contoh dari',
      inverseLabel: 'Dicontohkan oleh',
      description: 'Konsep sumber adalah contoh spesifik dari konsep tujuan.',
    },
  },
} satisfies CopyMap<Record<RelationType, Omit<RelationTypeMeta, 'type' | 'directional'>>>;

type RelationCopy = Widen<(typeof copy)[Language]>;

export function relationMetaFor(
  type: RelationType,
  language: Language = getLanguage(),
): RelationTypeMeta {
  return {
    ...RELATION_TYPE_META[type],
    ...(copy[language] as RelationCopy)[type],
  };
}

export function relationLabel(type: RelationType, language: Language = getLanguage()): string {
  return relationMetaFor(type, language).label;
}

export function useRelationMeta(): Record<RelationType, RelationTypeMeta> {
  const language = useLanguageStore((state) => state.language);
  return Object.fromEntries(
    (Object.keys(RELATION_TYPE_META) as RelationType[]).map((type) => [
      type,
      relationMetaFor(type, language),
    ]),
  ) as Record<RelationType, RelationTypeMeta>;
}
