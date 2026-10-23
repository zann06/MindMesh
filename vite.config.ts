import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

function normalizeBase(value: string): string {
  const base = value.trim() || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export default defineConfig({
  base: normalizeBase(process.env.VITE_BASE_PATH ?? '/'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1400,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    pool: 'forks',
    server: {
      deps: {
        inline: ['pdfjs-dist'],
      },
    },
  },
});
