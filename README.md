# Spliter

A shared-expense splitter for households and trips — a from-scratch
rebuild. See [docs/ROADMAP.md](docs/ROADMAP.md) for the full
phase-by-phase plan, [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) for
what's actually been built so far, and
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for how to ship it.

The original vanilla-JS version lives at `../Spliter-main` and is kept
as a read-only reference for product behavior — it is not part of this
codebase.

## Getting started

```bash
npm install
cp .env.example .env
npm run dev       # http://localhost:5173
```

| Script                            | What it does                                    |
| --------------------------------- | ----------------------------------------------- |
| `npm run dev`                     | Dev server with hot reload                      |
| `npm run build`                   | Type-check, then production bundle into `dist/` |
| `npm run preview`                 | Serve the built bundle locally                  |
| `npm test`                        | Run the test suite once                         |
| `npm run test:watch`              | Re-run tests on change                          |
| `npm run test:e2e`                | Playwright smoke test against a real build      |
| `npm run typecheck`               | `tsc -b` with no emit                           |
| `npm run lint` / `lint:fix`       | ESLint over `src` and `tests`                   |
| `npm run format` / `format:check` | Prettier over the repo                          |

## Stack

React 19 + TypeScript + Vite · Tailwind CSS v4 + shadcn/ui (Radix UI
primitives, Nova preset) · TanStack Query · React Hook Form + Zod ·
React Router (data router) · Supabase (backend, added in Phase 3) ·
Vitest + React Testing Library.

Full rationale for each choice is in
[docs/ROADMAP.md](docs/ROADMAP.md)'s decision table.
