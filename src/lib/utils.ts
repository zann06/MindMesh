import { clsx, type ClassValue } from 'clsx';
import { getLanguage, localeFor } from '@/app/language-store';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function newId(prefix = ''): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${uuid}` : uuid;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatDate(value: string | undefined, withTime = false): string {
  const indonesian = getLanguage() === 'id';
  if (!value) return indonesian ? 'Tidak pernah' : 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return indonesian ? 'Tanggal tidak diketahui' : 'Unknown date';
  return new Intl.DateTimeFormat(localeFor(), {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(date);
}

export function formatRelative(value: string | undefined): string {
  const indonesian = getLanguage() === 'id';
  if (!value) return indonesian ? 'Tidak pernah' : 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return indonesian ? 'Tidak diketahui' : 'Unknown';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60_000);
  const relative = new Intl.RelativeTimeFormat(localeFor(), { numeric: 'auto' });
  if (Math.abs(minutes) < 1) return indonesian ? 'Baru saja' : 'Just now';
  if (Math.abs(minutes) < 60) return relative.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relative.format(-days, 'day');
  return formatDate(value);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return getLanguage() === 'id'
    ? 'Terjadi kesalahan yang tidak terduga.'
    : 'An unexpected error occurred.';
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightRanges(
  text: string,
  query: string,
  maxSnippets = 3,
): Array<{ start: number; end: number; snippet: string }> {
  const needle = query.trim();
  if (!needle) return [];
  const re = new RegExp(escapeRegExp(needle), 'gi');
  const results: Array<{ start: number; end: number; snippet: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) && results.length < maxSnippets) {
    const start = Math.max(0, match.index - 90);
    const end = Math.min(text.length, match.index + needle.length + 130);
    results.push({
      start: match.index,
      end: match.index + needle.length,
      snippet: `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`,
    });
    if (match.index === re.lastIndex) re.lastIndex += 1;
  }
  return results;
}
