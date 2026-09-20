import { defineConfig, devices } from '@playwright/test'

/**
 * A single smoke-test project against a real production build
 * (`vite preview`), not the dev server — it should catch build-specific
 * regressions (asset paths, the PWA manifest link, etc.) that
 * `npm run dev` wouldn't. See PROJECT_STATE.md's Phase 10 notes for why
 * this doesn't exercise the authenticated app behind real Supabase auth
 * (email confirmation + the project's default email rate limit make
 * that impractical to script reliably) — it covers the public routes,
 * routing/redirect behavior, accessibility, and responsive layout
 * instead, which is where a build can regress independently of backend
 * data.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
