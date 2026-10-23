import { create } from 'zustand';

export type Language = 'en' | 'id';

export type CopyMap<T> = Record<Language, T>;

export type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => Widen<R>
        : T extends readonly (infer U)[]
          ? Widen<U>[]
          : T extends object
            ? { [K in keyof T]: Widen<T[K]> }
            : T;

const STORAGE_KEY = 'mindmesh.language';

function isLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'id';
}

function detectLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // Storage can be unavailable in hardened browser profiles.
  }
  return window.navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en';
}

export const useLanguageStore = create<{
  language: Language;
  setLanguage: (language: Language) => void;
}>((set) => ({
  language: detectLanguage(),
  setLanguage: (language) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // The in-memory choice still applies for this session.
    }
    document.documentElement.lang = language;
    set({ language });
  },
}));

if (typeof document !== 'undefined') {
  document.documentElement.lang = useLanguageStore.getState().language;
}

export function getLanguage(): Language {
  return useLanguageStore.getState().language;
}

export function useCopy<K extends CopyMap<unknown>>(copy: K): Widen<K[Language]> {
  const language = useLanguageStore((state) => state.language);
  return copy[language] as Widen<K[Language]>;
}

export function localeFor(language = getLanguage()): string {
  return language === 'id' ? 'id-ID' : 'en-US';
}
