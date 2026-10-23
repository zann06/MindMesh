import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

const local = new MemoryStorage();
const session = new MemoryStorage();
const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: local,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: session,
});

if (hasDom && window !== globalThis) {
  Object.defineProperty(window, 'localStorage', { configurable: true, value: local });
  Object.defineProperty(window, 'sessionStorage', { configurable: true, value: session });
}

afterEach(() => {
  if (hasDom) cleanup();
  local.clear();
  session.clear();
  vi.unstubAllGlobals();
});

if (hasDom && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (hasDom && !window.ResizeObserver) {
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverStub,
  });
}

if (hasDom && !window.IntersectionObserver) {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserverStub,
  });
}

if (hasDom && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

if (hasDom && !window.scrollTo) {
  window.scrollTo = vi.fn();
}

if (hasDom && !URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mindmesh-test');
}

if (hasDom && !URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}
