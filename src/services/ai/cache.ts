import { sha256Hex } from '@/services/document-parser/hash';

export interface AICache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  clear(): Promise<void>;
}

interface CacheEntry {
  key: string;
  at: number;
  value: string;
}

const PREFIX = 'mindmesh.ai.cache.';
const INDEX_KEY = 'mindmesh.ai.cache-index';
const MAX_ENTRIES = 40;
const MAX_VALUE_CHARS = 220_000;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function buildCacheKey(parts: Record<string, string | number | undefined>): Promise<string> {
  const stable = Object.keys(parts)
    .sort()
    .map((key) => `${key}=${parts[key] ?? ''}`)
    .join('\n');
  return sha256Hex(new TextEncoder().encode(stable));
}

function readIndex(): Array<{ key: string; at: number }> {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is { key: string; at: number } =>
        typeof entry?.key === 'string' && typeof entry?.at === 'number',
    );
  } catch {
    return [];
  }
}

function writeIndex(entries: Array<{ key: string; at: number }>): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
  } catch {
    // Storage may be full or disabled; caching is best-effort.
  }
}

export class LocalStorageAICache implements AICache {
  async get(key: string): Promise<string | null> {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry;
      if (!entry || entry.key !== key || typeof entry.value !== 'string') return null;
      if (Date.now() - entry.at > TTL_MS) {
        localStorage.removeItem(PREFIX + key);
        writeIndex(readIndex().filter((candidate) => candidate.key !== key));
        return null;
      }
      return entry.value;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (value.length > MAX_VALUE_CHARS) return;
    try {
      const entry: CacheEntry = { key, at: Date.now(), value };
      localStorage.setItem(PREFIX + key, JSON.stringify(entry));
      const index = readIndex().filter((candidate) => candidate.key !== key);
      index.unshift({ key, at: entry.at });
      const kept = index.slice(0, MAX_ENTRIES);
      for (const dropped of index.slice(MAX_ENTRIES)) {
        localStorage.removeItem(PREFIX + dropped.key);
      }
      writeIndex(kept);
    } catch {
      // Caching is an optimization, never a requirement for correctness.
    }
  }

  async clear(): Promise<void> {
    try {
      for (const entry of readIndex()) {
        localStorage.removeItem(PREFIX + entry.key);
      }
      localStorage.removeItem(INDEX_KEY);
    } catch {
      // Ignore unavailable storage.
    }
  }
}

export class MemoryAICache implements AICache {
  private readonly entries = new Map<string, { value: string; at: number }>();

  async get(key: string): Promise<string | null> {
    return this.entries.get(key)?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.entries.set(key, { value, at: Date.now() });
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }
}

export function getCacheKeyPrefix(): string {
  return PREFIX;
}
