import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Phase 10's one Playwright smoke test: a real browser against a real
 * production build (`vite preview`), covering what the Vitest+jsdom
 * suite structurally can't — real routing/redirects, real CSS layout,
 * an automated accessibility scan, and that the PWA manifest/icons this
 * phase added are actually served. It deliberately stays on the public
 * routes rather than faking a signed-in session against the live
 * Supabase project; see playwright.config.ts's top comment for why.
 */

test('redirects an unauthenticated visitor from / to /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
})

test('sign-in page validates client-side before ever contacting Supabase', async ({ page }) => {
  const authRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/auth/v1/')) authRequests.push(request.url())
  })

  await page.goto('/login')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByText('Enter your email')).toBeVisible()
  await expect(page.getByText('Enter your password')).toBeVisible()
  expect(authRequests).toEqual([])

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('sign-up page validates client-side before ever contacting Supabase', async ({ page }) => {
  const authRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/auth/v1/')) authRequests.push(request.url())
  })

  await page.goto('/signup')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Enter your name')).toBeVisible()
  await expect(page.getByText('Enter your email')).toBeVisible()
  await expect(page.getByText('At least 8 characters')).toBeVisible()
  expect(authRequests).toEqual([])

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('the PWA manifest and its icons are wired up and reachable', async ({ page }) => {
  await page.goto('/login')

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  )
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/apple-touch-icon.png',
  )

  const manifestResponse = await page.request.get('/manifest.webmanifest')
  expect(manifestResponse.ok()).toBe(true)
  const manifest = await manifestResponse.json()
  expect(manifest.name).toBe('Spliter')

  for (const icon of manifest.icons) {
    const iconResponse = await page.request.get(icon.src)
    expect(iconResponse.ok()).toBe(true)
  }
})

test('the login page has no horizontal overflow at the current viewport', async ({ page }) => {
  await page.goto('/login')
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
})
