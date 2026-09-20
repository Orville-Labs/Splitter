# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

Spliter — a shared-expense splitter for households/trips. A from-scratch
rebuild of the vanilla-JS app at `../Spliter-main` (kept as a read-only
reference for product behavior, not part of this codebase). React 19 +
TypeScript + Vite + Tailwind v4 + shadcn/ui, backed by Supabase
(Postgres + Auth + RLS + PostgREST).

All 10 planned phases are built and complete — see `docs/ROADMAP.md`
for the original plan and `docs/PROJECT_STATE.md` for the full history
of what was built, the decisions made along the way, and why. Read
`docs/PROJECT_STATE.md` before making non-trivial changes — it's long,
but it answers "why is this built this way" for almost everything
non-obvious in the codebase, so you don't re-litigate a decision that
was already made deliberately.

## Commands

```bash
npm run dev          # dev server, http://localhost:5173
npm run build         # tsc -b && vite build -> dist/
npm run preview       # serve the built bundle locally
npm test              # vitest run — component/unit suite (jsdom + fakeSupabase)
npm run test:watch    # vitest, watch mode
npm run test:e2e      # playwright — smoke test against a real production build
npm run typecheck     # tsc -b (checks src, tests, e2e — 3 project references)
npm run lint          # eslint src tests e2e playwright.config.ts
npm run lint:fix
npm run format        # prettier --write, whole repo
npm run format:check
```

Run `typecheck`, `lint`, `test`, and `build` before considering any
change done. Run `test:e2e` too if you touched routing, auth pages, the
PWA manifest, or anything accessibility-related — it builds and serves
the app itself, no dev server needed first.

## Architecture

```
src/
├── domain/       pure functions only — no DOM, no network, no Supabase.
│                 balances.ts (split/balance/settlement math), breakdown.ts,
│                 analytics.ts, csvExport.ts, dateRange.ts, money.ts.
│                 Ledger/Expense/Claim/Settlement types reference members
│                 and categories by opaque id, never by name.
├── data/         repository layer — one file per table, translates
│                 snake_case DB rows <-> camelCase domain shapes
│                 (mappers.ts). All Supabase calls live here; nothing
│                 above this layer imports `supabase` directly except
│                 lib/supabaseClient.ts and the query hooks.
├── queries/      TanStack Query hooks, one per table, plus useLedger
│                 (assembles the domain Ledger + NameLookup for one
│                 space from four unscoped queries) and useSpaces
│                 (resolves the active space, bootstraps a brand-new
│                 user's first space). staleTime: Infinity everywhere —
│                 every table loads once, switching spaces is a pure
│                 recompute, not a refetch. Mutations invalidate
│                 explicitly.
├── features/     one folder per feature area (expenses, settlements,
│                 categories, members, spaces, analytics, auth,
│                 navigation) — form/list/modal components + their
│                 mutation hooks.
├── routes/       AppShell (the app shell + all three tabs),
│                 ProtectedRoute (auth gate), ComingSoon (404 fallback).
├── state/        SessionContext/Provider (auth), ActiveSpaceContext/
│                 Provider (which space is active).
└── components/ui/  shadcn/ui primitives (generated, but hand-patched
                   in a few places for real a11y gaps — see CardTitle
                   in card.tsx for an example; don't revert those).
```

`supabase/migrations/` is the schema source of truth for the live
"Splitter-2.0" project — applied migrations, not generated output.
Never edit an existing migration file; add a new one.

## Conventions worth knowing before you deviate from them

- **No native `alert`/`confirm`/`prompt` anywhere** — shadcn
  `AlertDialog` + `sonner` toasts everywhere instead. This was an
  explicit, locked-in decision (see `docs/ROADMAP.md`).
- **Reset local UI state on context switch via `key={id}` remount, not
  an effect.** Every form/modal that needs to reset when its target
  changes (a different expense, a different space, a different
  settlement) is keyed by that target's id, not synced with
  `useEffect`. This is deliberate and consistent everywhere — don't
  introduce a `useEffect`-based reset as the exception.
- **Soft delete for any entity with history that must survive removal**
  (members, categories: `is_active`, never a real `DELETE`). Claims/
  expenses/settlements reference them with `ON DELETE RESTRICT`, so a
  hard delete would be blocked anyway once there's real history.
- **A shared UI pattern gets pulled into its own component the second
  time it's needed, not preemptively.** `TagRow`, `SplitParticipantRows`,
  `DateRangeFilter`, `ClaimsTally` all followed this — extracted only
  once a second real consumer showed up.
- **Domain math stays float-precise until the very last step** —
  `round2` is applied once per final displayed/stored value, never
  mid-calculation, so cumulative rounding error can't creep in.
- **Query failures must be visible, not silently "empty."** `useSpaces`/
  `useLedger` expose `isError`; don't add a new data hook that swallows
  a query error into a default empty value without surfacing it
  somewhere in the UI.
- **Timezone-sensitive dates always use local calendar fields**
  (`new Date(y, m, d)` / manual `YYYY-MM-DD` construction), never
  `toISOString()` or `new Date(isoString)` — both go through UTC and
  shift dates at positive UTC offsets (see `domain/dateRange.ts`).

## Testing

- `tests/` mirrors `src/`'s structure. `tests/helpers/fakeSupabase.ts`
  is an in-memory fake of the Supabase client (used via
  `vi.mock('@/lib/supabaseClient', ...)` in almost every test file) —
  prefer extending an existing table's fake behavior over inventing a
  new mocking approach. It has no error-injection support by design;
  tests that need a query to fail mock the specific repository function
  instead (see `tests/queries/useSpaces.error.test.tsx` for the
  pattern).
- `e2e/smoke.spec.ts` is Playwright, real browser, real `vite build &&
vite preview`. It deliberately only covers the public routes
  (login/signup, redirects, an axe-core accessibility scan, PWA
  manifest wiring) — it does not sign in against the live Supabase
  project. See `playwright.config.ts`'s top comment and
  `docs/DEPLOYMENT.md` for why (email confirmation + a very low default
  email-send rate limit make that unscriptable against this project).
- `tsconfig.app.json` only includes `src` — `tests/` and `e2e/` are
  covered by their own tsconfig files (`tsconfig.node.json` /
  `tsconfig.e2e.json`) referenced from the root `tsconfig.json`. If you
  add a new top-level directory with its own TS files, make sure it's
  actually included by _something_, or `npm run typecheck` will
  silently skip it.

## Known, accepted gaps (don't "fix" these without asking)

- The main JS chunk is ~925 KB (272 KB gzipped) — `vite build` warns
  about it. No code-splitting has been introduced; this was a
  conscious non-priority, not an oversight.
- No PWA service worker — the manifest/icons make the app installable
  but not offline-capable. See `docs/DEPLOYMENT.md`'s "PWA scope."
- No real end-to-end test against live Supabase auth exists or can
  practically exist against this project's current email settings — do
  one manual signup/confirm/sign-in pass after any deploy instead (see
  `docs/DEPLOYMENT.md`).

## Docs map

- `docs/ROADMAP.md` — the original 10-phase plan and locked-in stack
  decisions.
- `docs/PROJECT_STATE.md` — the full build history: what was built each
  phase, every non-obvious decision and why, verification commands run,
  open items. Long, but authoritative.
- `docs/DEPLOYMENT.md` — how to actually ship this (env vars, the
  Vercel SPA rewrite, Supabase Auth URL config, pre-deploy checklist).
