/// <reference types="vitest/config" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Playwright's own spec files live in e2e/ and run via `npm run
    // test:e2e`, not Vitest — without this exclude, Vitest's default
    // glob picks up *.spec.ts anywhere and tries (and fails) to run them
    // in jsdom.
    exclude: ['node_modules/**', 'e2e/**'],
    // vmThreads reuses one jsdom instance per worker instead of spinning up
    // a fresh one per test file — Vitest's own suggestion once the suite
    // grew past a handful of files. Keeps the default per-file module
    // isolation (several tests rely on it — see e.g. fakeSupabase.ts's
    // per-file mock state), unlike `isolate: false`, which shares it and
    // would leak state between files.
    pool: 'vmThreads',
    env: {
      VITE_APP_NAME: 'Spliter',
    },
  },
})
