# Spliter — Clean Rebuild Roadmap

This is a from-scratch rebuild of Spliter (a shared-expense splitter for
households and trips), not a migration. The old project at
`../Spliter-main` is left untouched as a reference for product behavior
(split math, feature list, UX flows) — nothing here reuses its code,
schema, or Supabase project.

## Decisions locked in for this rebuild

| Area                       | Decision                                                                                                                             | Why                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend                    | Supabase, **new project**, **redesigned schema**                                                                                     | Old schema referenced members/categories by name string, requiring atomic rename RPCs. New schema uses real IDs — renames become a plain `UPDATE`.                    |
| Auth                       | Supabase Auth from Phase 1 of the app (a "real" phase, not deferred)                                                                 | Retrofitting auth onto an app built for a single shared anon key is expensive. Designing RLS around `auth.uid()` from the start is not.                               |
| Frontend                   | React 18 + TypeScript + Vite                                                                                                         | Modern, standard, fast dev loop.                                                                                                                                      |
| Styling                    | Tailwind CSS + shadcn/ui                                                                                                             | Utility CSS + accessible unstyled primitives (Dialog, Tabs, DropdownMenu, Sheet) themed to a professional look, without hand-building focus traps and a11y from zero. |
| Server state               | TanStack Query                                                                                                                       | Cache + invalidation for all Supabase reads/writes.                                                                                                                   |
| Client state               | React Context for the few cross-cutting values (session, active space); local `useState` everywhere else                             | No Redux/Zustand — this app doesn't have enough cross-cutting state to justify it.                                                                                    |
| Forms                      | React Hook Form + Zod                                                                                                                | The expense form (dynamic per-member fields, cross-field "sum equals total" validation) is the one screen that benefits materially from a forms library.              |
| Routing                    | React Router (data router) for top-level routes only (`/login`, `/signup`, `/app`); in-app tabs stay as local state, not deep-linked | Auth needs real routes; the tab bar inside the app never needed URLs in the original and doesn't need them now.                                                       |
| Notifications/confirmation | shadcn `AlertDialog` + `sonner` toasts, replacing every `window.alert`/`confirm`/`prompt` from the original                          | Native browser dialogs are the single biggest thing standing between the original and a "modern, professional, polished" feel.                                        |
| Package manager            | npm                                                                                                                                  | No reason to switch off what the reference project already uses.                                                                                                      |
| Testing                    | Vitest + React Testing Library throughout; one thin Playwright smoke suite at the very end                                           | Same rationale as any modern React app: unit-test pure logic, component-test UI, one E2E pass for the golden path.                                                    |
| Location                   | `/home/aximsoft/Downloads/spliter-next` (sibling to `Spliter-main`)                                                                  | Keeps the reference app untouched and browsable.                                                                                                                      |

## Redesigned data model (target — built in Phase 3)

Every table below lives in the **new** Supabase project. All money-math
invariants from the original are preserved (see Phase 2); only the
_storage_ of "who" changes, from strings to IDs.

```
auth.users (managed by Supabase Auth)
profiles            id (=auth.users.id, pk), email, display_name, created_at

spaces              id (uuid, pk), owner_id (fk -> auth.users), name,
                    position, created_at

members             id (uuid, pk), space_id (fk -> spaces, cascade),
                    name, created_at
                    -- a "member" is a participant in a space's ledger,
                    -- not necessarily someone with a login. Renaming is
                    -- now a single UPDATE — no RPC needed.

categories          id (uuid, pk), space_id (fk -> spaces, cascade),
                    name, position, created_at

expenses            id (uuid, pk), space_id (fk -> spaces, cascade),
                    payer_id (fk -> members), amount, split_type
                    (EQUAL|EXACT|CLAIM), unit_price, expense_date, note,
                    created_at

expense_categories  expense_id (fk -> expenses, cascade),
                    category_id (fk -> categories, cascade)
                    -- replaces expenses.categories[] text array

expense_participants  expense_id (fk -> expenses, cascade),
                    member_id (fk -> members)
                    -- EQUAL only: who splits the amount evenly. No amount
                    -- column — the domain layer (expenseShareMap) divides
                    -- amount/count live. Storing a precomputed share here
                    -- would be derived data that could go stale if amount
                    -- changes without a corresponding update to this table;
                    -- deliberately not doing that. (Revised from an earlier
                    -- draft of this table during Phase 3 implementation —
                    -- see PROJECT_STATE.md's Phase 3 decisions.)

expense_shares      expense_id (fk -> expenses, cascade),
                    member_id (fk -> members), amount
                    -- EXACT only: the entered amount per participant.
                    -- replaces the original app's split_data jsonb.
                    -- CLAIM: neither table above has rows — claims is
                    -- authoritative.

claims              id (uuid, pk), expense_id (fk -> expenses, cascade),
                    member_id (fk -> members), amount, qty, claim_date,
                    created_at

settlements         id (uuid, pk), space_id (fk -> spaces, cascade),
                    from_member_id (fk -> members),
                    to_member_id (fk -> members), amount, settlement_date,
                    created_at
```

RLS on every table keys off `spaces.owner_id = auth.uid()` (directly on
`spaces`, transitively via `space_id`/`expense_id` elsewhere, using a
`security definer` helper function to avoid recursive-policy issues).
v1 is **single-owner per space** — no multi-user collaboration on one
space yet. That's a natural, explicitly-deferred future phase (a
`space_collaborators` join table), not part of this rebuild.

Domain invariants carried over unchanged from the original (see
`../Spliter-main/README.md` and `../Spliter-main/tests/domain/`):

- Split types EQUAL / EXACT / CLAIM, same share-computation rules.
- CLAIM's unclaimed remainder stays with the payer.
- 2-decimal rounding; the up-to-1-paisa residue on indivisible equal
  splits is a known limitation, not a bug to fix here.
- Default categories seeded on a new space: Petrol, Egg, Banana, Water,
  Outside Food, Entertainment, Other.
- Recent-entries cap of 25.

## Phase list

1. **Project scaffolding & tooling** — Vite/React/TS/Tailwind/shadcn/ESLint/Prettier/Vitest, empty shell, CI-less scripts, `PROJECT_STATE.md` seeded.
2. **Domain logic** — pure TS split/balance/settlement/breakdown/currency engine, fully unit-tested, zero backend or UI dependency.
3. **Supabase backend & auth foundation** — new project, redesigned schema migrations, RLS, generated types, repository layer, sign-up/sign-in/sign-out, session context, protected routing.
4. **App shell & navigation** — layout, top-level routes, TanStack Query client, active-space context, empty tab panels.
5. **Spaces & Members** — full CRUD + switch; member add/remove/rename (now trivial).
6. **Categories** — full CRUD + drag reorder.
7. **Expenses** — add/edit form (RHF+Zod), list, claims. Highest-complexity phase; depends on Phases 2, 5, 6.
8. **Settlements** — balances, suggested transfers, record/edit settlement, per-member breakdown modal.
9. **Analytics** — date filters, category/payer charts, CSV export.
10. **Polish & release readiness** — PWA manifest/icons, accessibility pass, responsive/mobile QA, loading/empty/error states audit, Playwright smoke test, deployment docs.

Each phase's implementation prompt (given one at a time, only after you
confirm the previous phase is complete) will:

- Tell the AI to read `PROJECT_STATE.md` first and inspect what actually
  exists on disk before changing anything.
- Restate the decisions above that are relevant to that phase.
- Give exact scope (files to create/modify, what's explicitly out of
  scope this phase).
- End with the AI updating `PROJECT_STATE.md` with what it built, any
  decisions it had to make, and what the next phase needs to know.

## Definition of done for the whole project

All 10 phases complete; `npm test`, `npm run lint`, `npx tsc --noEmit`,
and `npm run build` all clean; the app matches the original's feature
set (spaces, members, categories, add/edit expense with all three split
types, claims, settlements + breakdown, analytics + CSV) plus real
multi-user auth, with a Tailwind/shadcn UI replacing every native
`alert`/`confirm`/`prompt`.
