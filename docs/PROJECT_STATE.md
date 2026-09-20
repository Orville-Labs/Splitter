# Project State

Last updated: 2026-09-20 — Phase 10 (Polish & release readiness)
complete. All 10 ROADMAP.md phases are now built. Five ad-hoc additions
were requested and built ahead of Phase 10: a grouped transaction
timeline (see "Decisions made during the grouped-timeline feature"),
progressive disclosure on the "Recent entries" list (see "Decisions
made during the recent-entries progressive-disclosure feature"), three
refinements to the add-expense form's Note field and category tag row
(see "Decisions made during the expense-form refinements"), a way to
see/undo individual claim contributions from the edit sheet (see
"Decisions made during the claims-in-edit feature"), and the same
show-more pattern on "Record a settlement" plus a hard block on
overclaiming (see "Decisions made during the settlements-show-more and
overclaim-block feature"). Live demo data was also seeded into the real
"My Group" space for manual testing — see "Live demo data" near the end
of this file.

Phase 3 was verified live against a real Supabase project in a follow-up
pass after it was first built against a fake client with no project
available (see "Live project verification" further down for that
history). Phase 4 builds directly on that live-verified backend.

## What exists on disk right now

A working Vite + React + TypeScript project at the repo root (git
initialized, not yet committed — see "Open items"), with a complete
domain layer, a complete Supabase schema + RLS + repository layer (both
verified live against a real project), a working auth gate, and a real
app shell behind that gate: query hooks for every table, an
active-space context with auto-bootstrap for brand-new users, a
`useLedger` selector assembling the pure domain `Ledger` + `NameLookup`
per space, and a header/tabs/sidebar shell with **all three tab panels
now real** (Add, Settlement, and **Analytics — new this phase**).
Spaces, members, categories, expenses/claims, and settlements all have
full CRUD, and **Analytics is now real too**: a date-range filter
(reusing Phase 8's `DateRangeFilter`), total-spent/entries-logged
stats, spend-by-category and spend-by-member bar charts (new pure
aggregation functions — nothing like them existed in the domain layer
before this phase), and a CSV export of the full expense history. This
closed out ROADMAP.md's 9-phase feature list. Immediately afterward,
the user asked for one more thing ahead of Phase 10: `BreakdownModal`'s
per-member transaction list is now a grouped, day-by-day timeline with
date dividers and distinct in/out styling per row (new
`groupBreakdownByDay`/`formatDayDivider` pure functions). All 9
ROADMAP.md feature phases plus five ad-hoc additions were built before
Phase 10 started (see the top of this file for the full list). **Phase
10 (polish & release readiness) is now also complete**: a PWA manifest

- icon set, a Playwright smoke test (real browser, real production
  build, an automated axe-core accessibility scan) that found and fixed
  two real a11y bugs (see "Decisions made during Phase 10"), a real gap
  in how query failures were surfaced (silently rendered as "empty"
  instead of an actual error state — also fixed), a responsive/mobile
  code-level review, and `DEPLOYMENT.md`. Verified green: `npm run
typecheck`, `npm run lint`, `npm test` (279/279), `npm run test:e2e`
  (10/10), `npm run build`, a manual dev-server boot check. `.env` holds
  real Supabase project credentials.

```
spliter-next/
├── ROADMAP.md, PROJECT_STATE.md
├── README.md, DEPLOYMENT.md NEW (Phase 10) — env vars, SPA-fallback
│                            rewrite, Supabase Auth URL config, PWA scope
├── .env.example, .env (gitignored — has REAL Supabase
│                        credentials for "Splitter-2.0"), .gitignore
│                        (Phase 10 added Playwright's own output dirs)
├── index.html                  — title "Spliter", viewport-fit=cover;
│                                  Phase 10 added the manifest link,
│                                  apple-touch-icon, theme-color, and
│                                  apple-mobile-web-app-* meta tags
├── package.json, tsconfig.json, tsconfig.app.json, tsconfig.node.json
├── tsconfig.e2e.json            NEW (Phase 10) — separate from
│                                  tsconfig.node.json because Playwright
│                                  specs run browser-context callbacks
│                                  (need the DOM lib; vite.config.ts doesn't)
├── playwright.config.ts         NEW (Phase 10) — desktop + mobile
│                                  (Chromium-based; webkit was never
│                                  installed) projects, webServer runs a
│                                  real `vite build && vite preview`
├── vite.config.ts              — @tailwindcss/vite, "@" alias -> src,
│                                  vitest config (jsdom, tests/setup.ts,
│                                  pool: 'vmThreads'); Phase 10 added
│                                  `exclude: ['e2e/**']` so Vitest doesn't
│                                  also try to run Playwright's specs
├── eslint.config.js            — flat config, typescript-eslint,
│                                  react-hooks, react-refresh, prettier;
│                                  Phase 10 added an e2e/**+playwright.config.ts block
├── .prettierrc, .prettierignore
├── components.json             — shadcn: style "radix-nova", base
│                                  Radix UI, baseColor "neutral"
├── e2e/
│   └── smoke.spec.ts            NEW (Phase 10) — the one Playwright
│                                  smoke test; see "Decisions made during
│                                  Phase 10" for exactly what it covers
│                                  and why it doesn't sign in for real
├── public/
│   ├── favicon.svg
│   ├── manifest.webmanifest      NEW (Phase 10)
│   ├── icon-192.png, icon-512.png, maskable-icon-512.png,
│   │   apple-touch-icon.png      NEW (Phase 10) — rasterized from
│   │                              favicon.svg via a throwaway Playwright
│   │                              screenshot script, not committed
├── supabase/migrations/         — APPLIED to the live "Splitter-2.0"
│   │                              project (gqsqdguwhfsumbwrhopj)
│   ├── 20260918120000_init_schema.sql       tables, indexes, profile
│   │                                        bootstrap trigger
│   ├── 20260918120100_rls_and_functions.sql RLS policies, is_space_owner,
│   │                                        set_category_order, grants
│   ├── 20260918120200_expense_write_functions.sql
│   │                                         create_expense/update_expense
│   │                                         (atomic multi-table writes)
│   ├── 20260918130000_advisor_fixes.sql      NEW — post-apply fixes: lock
│   │                                         down two security-definer
│   │                                         functions, add 2 missing FK
│   │                                         indexes, RLS initplan perf fix
│   ├── 20260918130100_move_is_space_owner_to_private_schema.sql
│   │                                          NEW — moves the RLS helper
│   │                                          out of PostgREST's exposed
│   │                                          schema (see below)
│   ├── 20260918130200_revoke_anon_table_grants.sql
│   │                                          NEW — anon had full default
│   │                                          table grants project-wide
│   │                                          (see below); revoked
│   ├── 20260919090000_members_soft_delete.sql
│   │                                          NEW (Phase 5) — members gain
│   │                                          `is_active`; removing a
│   │                                          member is now a soft delete
│   │                                          (see Phase 5 notes)
│   └── 20260919090100_categories_soft_delete.sql
│                                              NEW (Phase 6) — same
│                                              treatment for categories
│                                              (see Phase 6 notes)
├── src/
│   ├── main.tsx                 — ThemeProvider(next-themes) >
│   │                              QueryClientProvider > SessionProvider >
│   │                              RouterProvider (data router), routes:
│   │                              /login, /signup, /app (protected, wraps
│   │                              its index element in ActiveSpaceProvider), *
│   ├── index.css                — Tailwind v4 import + shadcn CSS vars
│   │                              (see Phase 1's "Theme decisions")
│   ├── config/
│   │   ├── env.ts                validated env reader (Supabase vars, Phase 3)
│   │   └── constants.ts          NEW (Phase 4) — DEFAULT_CATEGORIES,
│   │                             ACTIVE_SPACE_STORAGE_KEY,
│   │                             RECENT_ENTRY_LIMIT, MAX_SPACE_NAME_LENGTH
│   │                             (ported from the original app);
│   │                             RECENT_ENTRIES_COLLAPSED_COUNT NEW
│   │                             (post-Phase-9) for the progressive-
│   │                             disclosure feature
│   ├── lib/
│   │   ├── queryClient.ts        the one QueryClient (staleTime: Infinity)
│   │   ├── supabaseClient.ts     typed against database.types.ts,
│   │   │                        persistSession: true
│   │   └── utils.ts              shadcn's `cn` re-export
│   ├── queries/                  NEW (Phase 4) — replaces the old
│   │   │                        reference app's store.js + eventBus.js
│   │   ├── keys.ts                query key constants, one per table
│   │   ├── useSpacesQuery.ts, useMembersQuery.ts, useCategoriesQuery.ts,
│   │   │   useExpensesQuery.ts, useSettlementsQuery.ts
│   │   │                          one useQuery wrapper per repository read
│   │   ├── useSpaces.ts           resolves the *effective* active space id
│   │   │                          (stored id if still valid, else first) +
│   │   │                          auto-bootstraps "My Group" for a
│   │   │                          brand-new user with zero spaces, now via
│   │   │                          spaceOperations.ts (Phase 5); Phase 10
│   │   │                          added `isError`, so a real query
│   │   │                          failure surfaces instead of quietly
│   │   │                          looking like "zero spaces"
│   │   ├── useLedger.ts           assembles the domain Ledger + NameLookup
│   │   │                          for one space from the 4 unscoped
│   │   │                          queries — `members`/`categories` are
│   │   │                          active-only, `names.members`/
│   │   │                          `names.categories` cover active+inactive
│   │   │                          (Phase 5 for members, Phase 6 for
│   │   │                          categories — both soft-deleted); Phase
│   │   │                          10 added `isError` (same reasoning as
│   │   │                          useSpaces.ts above)
│   │   └── spaceOperations.ts     NEW (Phase 5) —
│   │                              createSpaceWithDefaultCategories(ownerId,
│   │                              name, position), shared between bootstrap
│   │                              and user-triggered space creation
│   ├── routes/
│   │   ├── ComingSoon.tsx        catch-all 404
│   │   ├── ProtectedRoute.tsx    redirects to /login when signed out
│   │   └── AppShell.tsx          header, 3 tab panels (mounted always,
│   │                             toggled via the `hidden` attribute, not
│   │                             conditionally rendered), TabBar,
│   │                             SpacesSidebar, MembersModal (Phase 5),
│   │                             CategoriesModal (Phase 6),
│   │                             EditExpenseSheet + ClaimModal (Phase 7).
│   │                             editingExpenseId/claimingExpenseId are
│   │                             held as ids and re-resolved against the
│   │                             live ledger every render, never a
│   │                             snapshot Expense object (Phase 7 —
│   │                             see its notes), same treatment now
│   │                             also given to settlementTarget/
│   │                             breakdownMemberId (Phase 8). All
│   │                             three tab panels are real now
│   │                             (AddExpenseForm + ExpenseList;
│   │                             SettlementsView; AnalyticsView —
│   │                             Phase 9). ROADMAP.md's 9-phase feature
│   │                             list is now fully built — only Phase
│   │                             10 (polish) remains
│   ├── state/
│   │   ├── SessionContext.ts / SessionProvider.tsx   (Phase 3, unchanged)
│   │   └── ActiveSpaceContext.ts / ActiveSpaceProvider.tsx
│   │                              NEW (Phase 4) — same split-file pattern as
│   │                              Session*; holds only the raw stored id,
│   │                              persisted to localStorage under
│   │                              ACTIVE_SPACE_STORAGE_KEY. Resolving it
│   │                              against the real space list is useSpaces's
│   │                              job, not this provider's
│   ├── features/
│   │   ├── auth/                  (Phase 3, unchanged)
│   │   ├── navigation/TabBar.tsx  NEW (Phase 4) — bottom tab bar
│   │   ├── spaces/
│   │   │   ├── SpacesSidebar.tsx    create (inline input) + rename (inline
│   │   │   │                        pencil) + delete (AlertDialog, blocks
│   │   │   │                        deleting the last space) + switch;
│   │   │   │                        fires `onCreated` after a successful
│   │   │   │                        create (Phase 5)
│   │   │   └── useSpaceMutations.ts  NEW (Phase 5) — useCreateSpace,
│   │   │                             useRenameSpace, useDeleteSpace
│   │   └── members/
│   │       ├── MembersModal.tsx     NEW (Phase 5) — add/rename/remove
│   │       │                        members for the active space (Dialog +
│   │       │                        AlertDialog); remove is a soft delete
│   │       └── useMemberMutations.ts  NEW (Phase 5) — useAddMember,
│   │                                  useRemoveMember, useRenameMember
│   │   └── categories/
│   │       ├── CategoriesModal.tsx  NEW (Phase 6) — add/rename/remove/
│   │       │                        reorder categories for the active
│   │       │                        space (Dialog + AlertDialog); remove
│   │       │                        is a soft delete; reorder is up/down
│   │       │                        buttons, not drag-and-drop (see
│   │       │                        Phase 6 notes)
│   │       └── useCategoryMutations.ts  NEW (Phase 6) — useAddCategory,
│   │                                     useRemoveCategory,
│   │                                     useRenameCategory,
│   │                                     useReorderCategories
│   │   └── expenses/              NEW (Phase 7)
│   │       ├── expenseFormSchema.ts   Zod schema (amount/payer/date/
│   │       │                          note/split fields, all backed by
│   │       │                          plain strings — never
│   │       │                          z.coerce.number(), see its own
│   │       │                          docblock) + pure helpers:
│   │       │                          buildDefaultValues,
│   │       │                          expenseToFormValues (edit
│   │       │                          prefill), toExpenseInput
│   │       │                          (form -> repository shape),
│   │       │                          pruneParticipants
│   │       ├── splitHints.ts, formatting.ts   pure display-string
│   │       │                          helpers (equalSplitHint,
│   │       │                          exactSplitHint, initials,
│   │       │                          claimedTotal, unclaimed) — split
│   │       │                          out for unit testing, same
│   │       │                          reasoning as domain/money.ts
│   │       ├── ExpenseForm.tsx        the add/edit form's fields —
│   │       │                          ONE implementation shared by
│   │       │                          AddExpenseForm (mode="create")
│   │       │                          and EditExpenseSheet
│   │       │                          (mode="edit"), mirroring the
│   │       │                          original app's own
│   │       │                          splitEditor.js dedup lesson.
│   │       │                          A CLAIM expense being edited
│   │       │                          locks the split editor (unit
│   │       │                          price only) — see Phase 7 notes.
│   │       │                          Note is now required (post-
│   │       │                          Phase-9), and the category
│   │       │                          picker always sorts "Other" last
│   │       │                          and styles the trailing "Manage"
│   │       │                          button distinctly from the
│   │       │                          category pills — see "Decisions
│   │       │                          made during the expense-form
│   │       │                          refinements". When editing a
│   │       │                          CLAIM expense, also shows who
│   │       │                          claimed how much (ClaimsTally)
│   │       │                          with a delete-per-claim action
│   │       │                          — post-Phase-9 addition, see
│   │       │                          "Decisions made during the
│   │       │                          claims-in-edit feature"; needs a
│   │       │                          `names` prop for this (optional,
│   │       │                          defaults to an empty lookup —
│   │       │                          AddExpenseForm never passes one)
│   │       ├── TagRow.tsx, SplitParticipantRows.tsx   shared pickers
│   │       │                          (payer/category/claimant tags;
│   │       │                          EQUAL/EXACT participant
│   │       │                          checkbox+amount rows)
│   │       ├── ClaimsTally.tsx        NEW (post-Phase-9) — who claimed
│   │       │                          how much + a delete-per-claim
│   │       │                          action, pulled out of ClaimModal
│   │       │                          once ExpenseForm's locked-claim
│   │       │                          edit view needed the identical
│   │       │                          list (same "don't duplicate a
│   │       │                          picker" reasoning as TagRow/
│   │       │                          SplitParticipantRows/
│   │       │                          DateRangeFilter)
│   │       ├── AddExpenseForm.tsx     Card wrapper, `key={spaceId}`
│   │       │                          remounts ExpenseForm fresh on
│   │       │                          space switch instead of an
│   │       │                          effect-based reset
│   │       ├── EditExpenseSheet.tsx   Sheet wrapper + delete
│   │       │                          confirmation (AlertDialog); now
│   │       │                          also takes a `names` prop, to
│   │       │                          pass through to ExpenseForm
│   │       ├── ExpenseList.tsx        "Active claims" + "Recent
│   │       │                          entries" cards, row edit/delete
│   │       │                          actions, claim progress bar.
│   │       │                          "Recent entries" is progressively
│   │       │                          disclosed (post-Phase-9 addition)
│   │       │                          — RECENT_ENTRIES_COLLAPSED_COUNT
│   │       │                          shown, a "Show N more"/"Show
│   │       │                          less" toggle for the rest (still
│   │       │                          capped at RECENT_ENTRY_LIMIT).
│   │       │                          Its "Active claims"/"Recent
│   │       │                          entries" grouping is recomputed
│   │       │                          fresh from live data on every
│   │       │                          render, which is *why* deleting
│   │       │                          a claim from the edit sheet
│   │       │                          automatically moves an expense
│   │       │                          back into "Active claims" with
│   │       │                          no extra code — see the claims-
│   │       │                          in-edit decisions section
│   │       ├── ClaimModal.tsx         claim tally (now ClaimsTally) +
│   │       │                          claimant picker + qty-or-amount
│   │       │                          input + overclaim confirmation
│   │       │                          (AlertDialog); caller keys it by
│   │       │                          expense id (see Phase 7 notes on
│   │       │                          why, not an effect)
│   │       ├── useExpenseMutations.ts   useCreateExpense,
│   │       │                            useUpdateExpense,
│   │       │                            useDeleteExpense
│   │       └── useClaimMutations.ts     useCreateClaim, useDeleteClaim
│   │                                    — both invalidate
│   │                                    queryKeys.expenses (claims
│   │                                    are embedded per-expense, not
│   │                                    their own query — see
│   │                                    expenses.repository.ts).
│   │                                    useDeleteClaim is now called
│   │                                    from two places (ClaimsTally,
│   │                                    used by both ClaimModal and
│   │                                    ExpenseForm) — no change to
│   │                                    the hook itself was needed
│   │   └── settlements/           NEW (Phase 8)
│   │       ├── SettlementsView.tsx    balance cards (click -> breakdown),
│   │       │                          suggested transfers
│   │       │                          (computeSettlements, unused by
│   │       │                          any UI before this phase), and
│   │       │                          recorded settlements (edit/delete)
│   │       ├── SettlementModal.tsx    one Dialog for both "Record a
│   │       │                          settlement" and "Edit settlement"
│   │       │                          (settlement === null means
│   │       │                          create), "to" can never equal
│   │       │                          "from"; caller keys it by target
│   │       │                          so switching targets remounts it
│   │       │                          (same pattern as Phase 7's
│   │       │                          ClaimModal/ExpenseForm, not an
│   │       │                          effect)
│   │       ├── BreakdownModal.tsx     one member's balance breakdown
│   │       │                          (domain/breakdown.ts's
│   │       │                          buildBreakdown/sumBreakdown,
│   │       │                          unused by any UI before Phase 8)
│   │       │                          with its own independent date
│   │       │                          filter; also keyed by target
│   │       │                          member id. Rows now render as a
│   │       │                          grouped, day-by-day timeline
│   │       │                          (groupBreakdownByDay +
│   │       │                          formatDayDivider) with a colored
│   │       │                          icon per row for balance-in vs
│   │       │                          balance-out — an ad-hoc feature
│   │       │                          added right after Phase 9, see
│   │       │                          "Decisions made during the
│   │       │                          grouped-timeline feature"
│   │       ├── DateRangeFilter.tsx    NEW (Phase 9) — the RANGE_PRESETS
│   │       │                          tag row + custom from/to fields,
│   │       │                          pulled out of BreakdownModal once
│   │       │                          AnalyticsFilterModal needed the
│   │       │                          identical UI (see Phase 9 notes).
│   │       │                          Lives here since BreakdownModal
│   │       │                          was its first consumer, imported
│   │       │                          cross-feature by
│   │       │                          features/analytics/, the same way
│   │       │                          TagRow is imported from
│   │       │                          features/expenses/ everywhere
│   │       └── useSettlementMutations.ts   useCreateSettlement,
│   │                                        useUpdateSettlement,
│   │                                        useDeleteSettlement
│   │   └── analytics/              NEW (Phase 9)
│   │       ├── AnalyticsView.tsx      total spent + entries logged,
│   │       │                          spend-by-category and
│   │       │                          spend-by-member bar charts, a
│   │       │                          filter row (Filter button + a
│   │       │                          clearable range chip) placed
│   │       │                          above both charts — not nested
│   │       │                          inside one chart's card header
│   │       │                          the way the original app placed
│   │       │                          it (see Phase 9 notes), and a
│   │       │                          CSV export button
│   │       ├── AnalyticsFilterModal.tsx   thin Dialog wrapper around
│   │       │                              DateRangeFilter — no logic of
│   │       │                              its own
│   │       └── BarChart.tsx           shared horizontal bar chart, one
│   │                                  sequential hue (`bg-primary`),
│   │                                  sorted descending, direct value
│   │                                  labels — a "compare magnitude"
│   │                                  chart, not "identity", so no
│   │                                  categorical multi-hue palette
│   │                                  (see Phase 9 notes)
│   ├── components/ui/            shadcn: button, card (CardTitle now
│   │                              renders <h3>, not <div> — see Phase 4
│   │                              notes), dialog, alert-dialog, sheet,
│   │                              tabs, dropdown-menu, input, label,
│   │                              checkbox (NEW Phase 7 — see its
│   │                              tests/setup.ts ResizeObserver note),
│   │                              sonner
│   ├── domain/                   analytics.ts + csvExport.ts NEW
│   │                              (Phase 9) — spendByCategory/
│   │                              spendByPayer and buildExpensesCsv/
│   │                              slugify, both pure and unit-tested.
│   │                              breakdown.ts gained
│   │                              groupBreakdownByDay; dateRange.ts
│   │                              gained formatDayDivider (both
│   │                              post-Phase-9, for the grouped-
│   │                              timeline feature). Everything else
│   │                              here (Phase 2's original modules)
│   │                              remains untouched
│   └── data/                     members.repository.ts (Phase 5) and
│                                  categories.repository.ts (Phase 6) both
│                                  rewritten for soft delete — `is_active`
│                                  column, `removeMember`/`removeCategory`
│                                  now update instead of delete;
│                                  expenses.repository.ts/
│                                  claims.repository.ts/
│                                  settlements.repository.ts all
│                                  untouched since Phase 3 — their
│                                  create/update/delete functions
│                                  already existed; Phases 7 and 8 each
│                                  only added a query-hook layer on top;
│                                  listAllExpenses/listAllSettlements
│                                  still return Record<spaceId, T[]>
│                                  (Phase 4)
└── tests/
    ├── setup.ts                  jest-dom matchers, jsdom pointer-capture
    │                              polyfill, body scroll-lock reset (Phase 5),
    │                              ResizeObserver polyfill (Phase 7 — Radix
    │                              Checkbox needs it, jsdom has none)
    ├── helpers/
    │   ├── ledgerFixtures.ts, fakeSupabase.ts   (Phase 2/3; member AND
    │   │                                        category inserts now
    │   │                                        default is_active: true —
    │   │                                        Phase 5/6)
    │   └── renderWithProviders.tsx  QueryClientProvider + fixed
    │                                SessionContext + ActiveSpaceProvider
    ├── domain/                   (Phase 2 — 52 tests) + analytics.test.ts,
    │                            csvExport.test.ts NEW (Phase 9)
    ├── data/                     spaces/members/categories/expenses/
    │                            settlements repository tests (members'
    │                            and categories' updated for soft-delete
    │                            semantics — Phase 5/6)
    ├── features/auth/, state/SessionProvider.test.tsx,
    │   routes/ProtectedRoute.test.tsx            (Phase 3)
    ├── features/spaces/useSpaceMutations.test.ts, SpacesSidebar.test.tsx
    │   (Phase 5)
    ├── features/members/useMemberMutations.test.ts, MembersModal.test.tsx
    │   (Phase 5)
    ├── features/categories/useCategoryMutations.test.ts,
    │   CategoriesModal.test.tsx    (Phase 6)
    ├── features/expenses/          (Phase 7) — expenseFormSchema.test.ts,
    │   splitHints.test.ts, formatting.test.ts (pure, no DOM),
    │   useExpenseMutations.test.ts, useClaimMutations.test.ts,
    │   AddExpenseForm.test.tsx, EditExpenseSheet.test.tsx,
    │   ExpenseList.test.tsx, ClaimModal.test.tsx,
    │   ClaimsTally.test.tsx NEW (post-Phase-9)
    ├── features/settlements/       (Phase 8) —
    │   useSettlementMutations.test.ts, SettlementsView.test.tsx,
    │   SettlementModal.test.tsx, BreakdownModal.test.tsx
    ├── features/analytics/         NEW (Phase 9) — BarChart.test.tsx,
    │   AnalyticsView.test.tsx (AnalyticsFilterModal has no dedicated
    │   file — it's a thin wrapper with no logic of its own, and
    │   DateRangeFilter's own behavior is already covered via
    │   BreakdownModal.test.tsx)
    ├── state/ActiveSpaceProvider.test.tsx
    ├── queries/useSpaces.test.tsx, useLedger.test.tsx
    ├── routes/AppShell.test.tsx
    └── routes/AppShellCategoriesMenu.test.tsx    (Phase 6) — kept in
                                    its own file, see Phase 6 notes on the
                                    userEvent/Radix cross-test finding
```

## Locked decisions (see ROADMAP.md for full rationale)

- Reference app (behavior/feature source of truth): `../Spliter-main` —
  read-only, never modified, never executed as part of this rebuild.
- Backend: brand-new Supabase project, redesigned relational schema
  (real member/category IDs, not name strings — see ROADMAP.md's
  "Redesigned data model"). Schema is built in Phase 3, not before.
- Auth: Supabase Auth, built in Phase 3. v1 is single-owner-per-space
  (no multi-user collaboration on one space yet).
- Stack: React 19 + TypeScript + Vite 8 (whatever `npm create vite@latest`
  resolved to at scaffold time — see exact versions below), Tailwind
  CSS v4 + shadcn/ui, TanStack Query, React Hook Form + Zod, React
  Router v7 (data router; top-level routes only — in-app tabs are local
  state, not deep-linked).
- Alerts/confirms: shadcn `AlertDialog` + `sonner` toasts everywhere —
  never a native `window.alert`/`confirm`/`prompt`.
- Package manager: npm.
- Testing: Vitest + React Testing Library per phase; one Playwright
  smoke suite in the final phase only.

## Decisions made _during_ Phase 1 (not pre-decided — record these)

- **shadcn component-library variant:** the current shadcn CLI (v4.21)
  offers three primitive libraries (Base UI, React Aria, Radix UI).
  Chose **Radix UI** — the long-standing, most widely documented option,
  not the CLI's own "Recommended" default (Base UI), which is newer and
  less proven. All shadcn components in `src/components/ui/` are built
  on Radix.
- **shadcn visual preset:** chose **Nova** (Lucide icons, Geist font)
  from the CLI's preset picker — a clean, neutral, professional-reading
  default. `baseColor` is "neutral" (grayscale), then hand-customized
  (see Theme decisions below).
- **Theme decisions** (in `src/index.css`, both `:root` and `.dark`):
  - `--primary` set to a vivid blue (`oklch(0.546 0.215 262.881)` light /
    `oklch(0.623 0.188 259.815)` dark) — a brand color, replacing the
    preset's default near-black/near-white neutral primary.
  - Added two custom semantic tokens not in stock shadcn: `--positive`
    (green, `oklch(0.596 0.145 163.225)` light / `oklch(0.696 0.153
162.48)` dark) and `--negative` (red, reuses the same values as
    `--destructive`) — for balance amounts ("you get back" / "you
    owe"), distinct in _intent_ from `--destructive` (delete actions)
    even though negative currently equals destructive numerically.
    Exposed as Tailwind utilities via `@theme inline`: `bg-positive`,
    `text-positive`, `bg-negative`, `text-negative`, plus `-foreground`
    variants. **Future phases (7, 8) must use these tokens for every
    balance/amount display, not ad-hoc green/red classes.**
  - Font: Geist Variable (via `@fontsource-variable/geist`, self-hosted
    — not a Google Fonts CDN link), set as `--font-sans` / `--font-heading`.
  - Radius scale, chart colors, sidebar colors: left at the Nova preset
    defaults (untouched, no product reason yet to change them).
- **ESLint plugin compatibility:** `eslint-plugin-react-hooks` 7.x and
  `eslint-plugin-react-refresh` still export their configs in the old
  eslintrc `plugins: ["name"]` shape, not flat-config's `plugins: {
name: pluginObject }` shape. `eslint.config.js` manually destructures
  `.configs['recommended-latest'].rules` / `.configs.vite.rules` instead
  of using `extends` for these two plugins. If either package ships a
  native flat preset later, this can simplify — not urgent.
- **`react-refresh/only-export-components` disabled for
  `src/components/ui/**`** — shadcn's generated files intentionally
  co-export variant helpers (e.g. `buttonVariants` from `button.tsx`)
  alongside the component, which the rule otherwise flags. This is
  standard for the shadcn ecosystem; do not "fix" it by editing
  generated component files.
- **TypeScript `baseUrl` omitted** in all three tsconfig files — TS 6.0
  deprecates `compilerOptions.baseUrl`. Path alias `@/*` -> `./src/*` is
  declared via `paths` alone, which resolves fine under `moduleResolution:
"bundler"` without `baseUrl`.
- **`.env` was created** (gitignored) with `VITE_APP_NAME=Spliter` so
  `npm run dev`/`build` work locally out of the box. `.env.example`
  documents it plus commented-out placeholders for the Supabase vars
  Phase 3 will add.

## Decisions made _during_ Phase 2 (not pre-decided — record these)

- **Domain identity model: ids, never names.** `balances.ts` defines
  `MemberId`/`CategoryId` as opaque string aliases. `Expense.payer`,
  `.participants`, `.splitData` keys, `Claim.member`, and
  `Settlement.from`/`.to` are all ids — never display names. This
  matches ROADMAP.md's "Redesigned data model" (real member/category
  ids instead of the original app's name-string identity) and is the one
  substantive deviation from a line-for-line port. The math itself
  (`expenseShareMap`, `computeBalances`, `computeSettlements`) is
  otherwise unchanged from `../Spliter-main/src/domain/balances.js`.
- **`breakdown.ts` needs names for its human-readable text** ("Paid ₹900
  total · your share ₹300", "Received from Kavin") but must stay a pure
  function with no data-fetching of its own. Resolved by adding a
  `NameLookup` parameter (`{ members: Record<MemberId,string>,
categories: Record<CategoryId,string> }`) — still just data in, data
  out. **Every future caller of `buildBreakdown`/`categoryLabel` (Phase
  7 expense list, Phase 8 breakdown modal) must build this lookup from
  the members/categories query cache and pass it in** — there is no
  fallback that "just works" without it (an unknown id falls back to
  printing the raw id, which will look wrong, not crash).
- **`Expense.categories` renamed to `categoryIds`** (array of category
  ids, not name strings) — consistent with the identity-model change
  above and with the schema's `expense_categories` join table.
- **Fixed a latent bug while porting `computeSettlements`:** the
  original joined `from`/`to` with a plain space (`` `${from} ${to}` ``)
  to dedupe repeated transfer pairs before splitting the key back apart.
  Any id/name containing a space (e.g. the original app's own "Kavin R"
  rename example) would have misparsed. Ported version joins with `\0`
  instead. Covered by a new regression test in `balances.test.ts`
  ("handles an id containing a space..."). This is a genuine bug fix,
  not a behavior change to anything the original test suite covered —
  flagging it per this rebuild's own rule to record any place a port
  deviates from a pure line-for-line copy.
- **Removed one dead parameter:** the original `describeExpense(expense,
member, paid, owed)` never used `member` in its body (JS/ESLint's
  default `no-unused-vars` only flags _trailing_ unused args, so this
  was never caught upstream). TypeScript's `noUnusedParameters` does
  flag it regardless of position, so it was removed rather than
  underscore-prefixed to silence it — it was truly dead.
- **Added test coverage the original didn't have:** a dedicated
  `money.test.ts` (round2/formatCurrency/isSettled were previously only
  exercised indirectly through balance assertions), plus the two new
  regression/behavior tests called out above.

## Decisions made _during_ Phase 3 (not pre-decided — record these)

- **Schema refinement:** ROADMAP.md originally sketched one
  `expense_shares` table covering both EQUAL and EXACT, with EQUAL's
  amount "computed at save time." Implementing it, that meant storing a
  derived value that could go stale if `amount` changed later without a
  corresponding rewrite. Split into two tables instead:
  `expense_participants` (EQUAL — who's in it, no amount column; the
  domain layer divides live) and `expense_shares` (EXACT only — real
  entered amounts). ROADMAP.md's schema section has been updated to
  match. See the migration file and `mappers.ts`'s `toExpense`.
- **New atomic RPCs the original app didn't need:** `create_expense` /
  `update_expense`. The original stored one expense as a single
  denormalized row, so one insert/update was naturally atomic. This
  schema spreads one expense across `expenses` + `expense_categories` +
  (`expense_participants` | `expense_shares`), so a plain multi-request
  client write could fail partway through. Both RPCs are `security
invoker` (not `security definer`) — RLS on each table still governs
  every statement inside exactly as if the caller issued them directly.
  `update_expense` deliberately never touches `claims` (same invariant
  as the original: editing never mutates contributions already logged).
- **No embedded/nested PostgREST selects.** `expenses.repository.ts`'s
  `listAllExpenses` issues 5 separate reads (expenses, the two join
  tables, shares, claims) and joins them client-side, rather than using
  `select('*, expense_categories(...), ...')`. This mirrors the original
  app's "load everything, group client-side" philosophy (its old
  `store.js`) and — practically — was much simpler to fake generically
  in `tests/helpers/fakeSupabase.ts` than PostgREST's embed syntax would
  have been. Revisit only if this becomes a real N+1/latency problem.
- **RLS design:** single `is_space_owner(space_id)` security-definer
  helper function, reused across every policy that isn't directly on
  `spaces`. `spaces` itself checks `owner_id = auth.uid()` directly.
  `set_category_order` is explicitly **not** security definer — the
  categories table's own RLS policy already governs it correctly for
  the invoker role, so there's no reason to bypass row security there.
- **Auth model is single-owner-per-space**, per ROADMAP.md — `spaces.owner_id`,
  no collaborator table. A `profiles` table mirrors `auth.users` via an
  `on_auth_user_created` trigger (standard Supabase pattern), since the
  client can't query `auth.users` directly.
- **Supabase-js v2.116's generic `Database` type requires fields a
  straightforward hand-written schema wouldn't naturally include**:
  every table needs `Relationships: []` and the schema needs
  `Views: {}`, or postgrest-js's type inference silently collapses
  every row/insert/update type to `never` (discovered via `tsc` errors
  that looked unrelated at first — "argument of type 'null' is not
  assignable to type '{id: string; ...}'"). Documented in
  `database.types.ts` itself so this doesn't have to be rediscovered.
- **`unwrap()` rewritten to use Supabase's own `PostgrestSingleResponse<T>`
  type** instead of a hand-rolled `{data, error}` shape. The hand-rolled
  version structurally couldn't be narrowed correctly against
  postgrest-js's actual discriminated union (`PostgrestResponseSuccess<T>
| PostgrestResponseFailure`), causing the same `never`-collapse
  symptom above at call sites. Using Supabase's real exported type
  (re-exported from `@supabase/supabase-js`) fixed it outright and is
  more correct anyway — it's literally what every repository call
  actually receives at runtime.
- **`fakeSupabase.ts` hand-simulates `create_expense`/`update_expense`**
  in JS, mirroring their SQL bodies statement-for-statement (including
  the "never touch claims on update" invariant — caught and fixed a bug
  in the fake itself while writing it, see the file's
  `clearExpenseSplitData` vs `cascadeExpenseChildren` split). This is
  necessarily a duplicate of logic that lives in SQL; if the SQL
  changes, this fake must be updated too, and nothing enforces that
  automatically. Flagging as a known maintenance coupling, not fixing
  it now (no better option exists without a real Postgres to test
  against).
- **`App.tsx` and its lone placeholder route were retired this phase**,
  earlier than PROJECT_STATE.md previously said ("Phase 4 replaces
  them") — Phase 3 already had to rewrite `main.tsx`'s routing wholesale
  for `/login`/`/signup`/`/app`, so keeping the Phase-1 placeholder
  around as dead code until Phase 4 served no purpose. `AppPlaceholder.tsx`
  (behind the auth gate) is the new placeholder Phase 4 replaces.
- **No live Supabase project** — every repository/auth call is
  type-correct and unit-tested against `fakeSupabase.ts`, but has never
  hit a real Postgres or a real `auth.users` row. See "Open items."
  (Resolved shortly after — see "Live project verification" below.)

## Decisions made _during_ Phase 4 (not pre-decided — record these)

- **Real architectural gap found and fixed: `listAllExpenses`/
  `listAllSettlements` had no way to be grouped by space.** The domain
  `Expense`/`Settlement` types (Phase 2) deliberately carry no
  `spaceId` — the domain layer doesn't know "spaces" exist. That's
  correct for the pure math, but it meant Phase 3's repositories
  returned flat `Expense[]`/`Settlement[]` with **no way for
  `useLedger` to tell which space each one belonged to** once loaded.
  Fixed by changing both functions' return type to
  `Record<spaceId, T[]>` (grouped once, at the repository boundary) —
  mirroring the original reference app's `store.js`, which grouped raw
  rows by `space_id` as it loaded them rather than carrying a space id
  on the mapped domain object itself. This changed
  `expenses.repository.ts`/`settlements.repository.ts`'s public
  contract; `tests/data/expenses.repository.test.ts` was updated to
  match, and a `tests/data/settlements.repository.test.ts` was added
  (there wasn't one before — settlements had only been exercised
  indirectly via expense tests until now).
- **`useSpaces` owns bootstrap + "preferred space" resolution;
  `ActiveSpaceContext`/`Provider` stay dumb.** Mirrors the
  `SessionContext`/`SessionProvider` split from Phase 3: the Context
  only holds the raw stored id + a setter (persisted to localStorage
  under `ACTIVE_SPACE_STORAGE_KEY`). `useSpaces` is what resolves the
  _effective_ active id (stored id if it still exists in the loaded
  space list, else the first space — mirrors the original app's
  `preferredSpaceId()`) and auto-creates a "My Group" space seeded with
  `DEFAULT_CATEGORIES` when a signed-up user owns zero spaces (mirrors
  the original's `main.js` bootstrap). Guarded with both
  `bootstrap.isPending` and `bootstrap.isSuccess` checks in the
  triggering `useEffect` so it can't double-fire.
- **Tab panels are mounted always, toggled via the `hidden` attribute**
  (native HTML, not a custom CSS class) — not conditionally rendered.
  Same rationale carried over from the original migration-plan
  discussion: switching tabs must not reset in-progress state in
  another tab (a future expense-form draft, an open filter, etc.).
  `hidden` also removes the element from the accessibility tree
  entirely (confirmed via an RTL test failure while writing
  `AppShell.test.tsx` — `getByRole` correctly can't find a hidden
  heading without passing `{ hidden: true }`), which is the behavior
  actually wanted here, not a workaround.
- **Fixed a real, reusable accessibility gap in the generated shadcn
  `Card` primitive**: `CardTitle` rendered as a plain `<div>` with zero
  heading semantics — invisible to screen-reader heading navigation.
  Found because an RTL test tried to query it by `role: 'heading'` and
  failed. Every future phase's cards (Settlements, Analytics, the
  expense list) will use `CardTitle` as their section heading, so this
  was fixed once, at the component, rather than worked around per call
  site: `CardTitle` now renders an `<h3>` (the app's own `<h1>` is the
  page title; cards sit one level down inside `<main>`). This is a
  correctness fix, not the same category of thing as the earlier
  Phase-1 decision not to edit generated files to appease a lint rule —
  this is a real, user-facing a11y defect in the generated output.
- **Spaces sidebar is read+switch only this phase.** Create/rename/
  delete are explicitly Phase 5's ("Spaces & Members") job per
  ROADMAP.md. `SpacesSidebar.tsx` only lists existing spaces (including
  the auto-bootstrapped first one) and switches the active one on
  click.
- **Sign-out lives in `AppShell`'s header dropdown now**, not a
  dedicated placeholder page — `AppPlaceholder.tsx` (which had a bare
  sign-out button) is fully retired; `AppShell` is its replacement.

## Decisions made _during_ Phase 5 (not pre-decided — record these)

- **Real schema gap found and fixed: `members` had `ON DELETE RESTRICT`
  semantics via a plain unique constraint, which would block removing
  any member who already has expense history** — a hard contradiction
  of the original app's actual requirement (you can remove someone from
  a group without erasing what they paid/owe). Fixed with a soft-delete
  migration (`20260919090000_members_soft_delete.sql`): added `is_active
boolean not null default true`, dropped the old `unique(space_id,
name)`, replaced it with a partial unique index
  `members_space_id_name_active_key ... where is_active` (so a removed
  member's name can be reused by a new member, but two _active_ members
  can't collide). `removeMember` now does `update ... set is_active =
false` instead of a real delete. Applied live via Supabase MCP,
  confirmed clean via `get_advisors`.
- **`useLedger` now distinguishes `members` (active-only) from
  `names.members` (active+inactive)**: the roster shown for adding
  expenses/settling up must exclude removed members, but past expenses
  referencing a removed member's id still need their name to render
  correctly in history. Computed as `everyMember` (all rows for the
  space) filtered down to `members` (active only) for the roster, while
  `names.members` is built from `everyMember`.
- **`createSpaceWithDefaultCategories` extracted to
  `queries/spaceOperations.ts`**, shared between `useSpaces`'s
  auto-bootstrap (Phase 4) and the new user-triggered "create space"
  flow (Phase 5) — was inline/duplicated logic before this phase.
- **New mutation-hook files, one per feature, following the pattern
  flagged as the template in Phase 4's open items**:
  `features/spaces/useSpaceMutations.ts` (create/rename/delete) and
  `features/members/useMemberMutations.ts` (add/rename/remove-as-soft-
  delete). Each invalidates the relevant query keys; `useDeleteSpace`
  invalidates spaces/members/categories/expenses/settlements together
  since deleting a space cascades through all of them server-side.
- **"Protect the last space" and duplicate-name checks are client-side
  UX guards via `toast.error`, not server constraints** — deleting a
  user's only remaining space, or adding/renaming a member to a name
  already in use in that space, are blocked in `SpacesSidebar.tsx`/
  `MembersModal.tsx` before the mutation ever fires. The partial unique
  index above is still the real server-side backstop for the name
  collision case; the toast is just a faster, friendlier failure path.
- **Fixed a real, standalone a11y gap**: the header's icon-only account
  button had `aria-hidden` on its `<User>` icon and no accessible name
  of its own. Added `aria-label="Account menu"` — found while writing a
  test that needed to target it by role, but a genuine screen-reader gap
  independent of testing.
- **userEvent.click() finding, recorded so it isn't rediscovered**: in
  this suite, `userEvent.click()`'s default hover-simulation step never
  resolves against the header's `DropdownMenuTrigger` (a `Button` with
  `asChild` inside it) — confirmed the click event does reach the real
  DOM node (via a temporary diagnostic handler, since removed), and that
  the _only_ thing standing between the event and the menu opening was
  userEvent's synthetic pointer-move-then-click sequence. Passing
  `userEvent.setup({ skipHover: true })` (or using `user.pointer(...)`
  directly) resolves it. This reproduced with the real `AppShell` alone
  in its own test file with nothing else in the suite — ruled out sheet/
  dialog cross-test pollution, jsdom's missing pointer-capture API (a
  real, separate gap — polyfilled in `tests/setup.ts` regardless), and
  `pool: 'vmThreads'` as causes before landing on this. **If a future
  phase's test can't get a Radix trigger to open via a plain
  `user.click()`, try `skipHover: true` before assuming it's a test-
  isolation problem.**

## Decisions made _during_ Phase 6 (not pre-decided — record these)

- **Categories get the same soft-delete treatment as members, but for a
  different reason.** Unlike members, `expense_categories.category_id`
  references `categories(id)` with `ON DELETE CASCADE`, not
  `ON DELETE RESTRICT` — a real DELETE would never be blocked by
  Postgres even with expense history. But it would silently cascade-
  remove the join row, erasing that category's tag from every past
  expense that used it and retroactively changing category-based
  analytics for prior periods (Phase 9). Soft-deleting instead
  (`20260919090100_categories_soft_delete.sql`: `is_active` column, old
  plain `unique(space_id, name)` replaced with a partial unique index
  `where is_active`, same shape as members') keeps those join rows
  intact so history stays accurate. Applied live via Supabase MCP,
  confirmed clean via `get_advisors`.
- **`useLedger` now applies the identical active/all split to categories
  that Phase 5 gave members**: `categories` (active only) is what the
  manage list and the future expense-form picker show; `names.categories`
  is built from every category, active or not, so old expenses tagged
  with a since-removed category still resolve a real name instead of
  falling back to a raw id.
- **Reorder is up/down buttons, not the original app's drag-and-drop.**
  The original (`categoriesModal.js`/`dragReorder.js`) used HTML5 drag
  events plus a pointer-based fallback for touch, with no keyboard path
  at all. This project has already treated similar a11y gaps in ported/
  generated UI as real bugs worth fixing rather than reproducing (Phase
  4's `CardTitle`, Phase 5's account-menu `aria-label`) — drag-and-drop
  alone has no keyboard equivalent, and native HTML5 drag events plus
  jsdom's already-confirmed pointer-capture gaps (Phase 5) would have
  made this the least testable interaction in the app for no product
  benefit over a simple, fully accessible, fully testable pair of
  "Move up"/"Move down" icon buttons (disabled at each end of the list).
  `CategoriesModal.test.tsx` covers both the move action and the
  disabled-at-the-boundary state.
- **Category CRUD reuses Phase 5's established shape exactly**: one
  `use*Mutations.ts` file per feature (`useCategoryMutations.ts`:
  useAddCategory/useRenameCategory/useRemoveCategory/
  useReorderCategories, each invalidating `queryKeys.categories`), one
  `*Modal.tsx` (Dialog for the manage list + inline rename, AlertDialog
  for the remove confirmation, `toast.error` for the duplicate-name
  guard), and a `Tag` DropdownMenuItem added to `AppShell.tsx`'s header
  menu right below "Group members." No new UI patterns were invented
  this phase.
- **Real cross-test Radix/userEvent finding, distinct from Phase 5's
  `skipHover` one**: a _second_ real open of the exact same
  `DropdownMenuTrigger` within one test file fails — even in a
  completely fresh `render()` each time, even with `skipHover: true`,
  even with no Dialog/Sheet ever opened in between (isolated it down to
  two back-to-back "click trigger, assert menu item text" tests and
  nothing else). Confirmed the fix is simply putting the second such
  test in its own file — some Radix-internal module-level state isn't
  reset between tests in the same file under this project's
  `pool: 'vmThreads'` config, only between separate files. This is why
  `AppShellCategoriesMenu.test.tsx` exists as a separate file instead of
  a third test in `AppShell.test.tsx`. **If a future phase needs to open
  the _same_ dropdown/menu trigger in more than one test, put each such
  test in its own file rather than assuming `skipHover` alone is enough.**

## Decisions made _during_ Phase 7 (not pre-decided — record these)

- **Numeric form fields are plain strings in the schema, never
  `z.coerce.number()`.** amount, the per-member EXACT amounts, and the
  CLAIM unit price are all backed by real `<input type="number">`
  elements, which always hold a string in the DOM regardless of the
  schema's declared type. `z.coerce.number()` would make the field's
  _input_ type (what RHF's `defaultValues`/`reset` need to accept, e.g.
  `''` for "empty") disagree with its _output_ type (`number`), which
  either fights TypeScript or silently coerces `''` to `0` in ways that
  don't match "the field is empty, not invalid." Every numeric field
  stays a `z.string()` validated with `.refine()`/`superRefine`, parsed
  explicitly with `parseFloat(...) || 0` only in `toExpenseInput` (and
  in the exact-sum check) — one parsing rule, applied at the boundary,
  exactly mirroring the original app's own `currentAmount()`/
  `readExactAmounts()` helpers.
- **One `ExpenseForm` component, shared by create and edit, exactly
  like the original app's own `splitEditor.js` extraction.** The
  original's `expenseForm.js`/`editExpenseModal.js` were near-identical
  copies of each other before `splitEditor.js` was pulled out — its own
  docblock says so ("one implementation means a fix lands in both
  places"). Rather than repeat that mistake, `ExpenseForm.tsx` **is**
  the whole form (fields, split editor, submit/cancel/delete buttons),
  parameterized by `mode: 'create' | 'edit'`; `AddExpenseForm.tsx` and
  `EditExpenseSheet.tsx` are just chrome (a `Card` vs. a `Sheet`) around
  it.
- **Editing a CLAIM expense locks the split editor to just the unit
  price — never lets it convert to EQUAL/EXACT, or vice versa.** Matches
  the original app's edit sheet exactly: it only ever offered Equal/
  Exact buttons (no Claim button) when editing a non-claim expense, and
  showed _no_ split buttons at all for an existing claim, just the unit
  price. A claim's shares come from contributions people have already
  logged (`claims` rows), not a participant picker, so there's no sane
  way to convert one to EQUAL/EXACT without discarding that history —
  the original never offered a path to do it, and this port doesn't
  either. `isLockedClaim` in `ExpenseForm.tsx` drives this.
- **`AppShell.tsx` holds `editingExpenseId`/`claimingExpenseId` as
  plain ids, and re-derives the actual `Expense` object fresh from
  `ledger.expenses` on every render — never a snapshot object captured
  at click-time.** Caught this as a real bug before it shipped: a
  snapshot would mean logging a claim while `ClaimModal` is open (which
  deliberately stays open afterward, to allow logging several
  contributions in a row) wouldn't visibly update the tally/progress
  bar without closing and reopening the modal — a stale read of data
  that just changed. Deriving from the live query result on every
  render fixes this for free, since TanStack Query's cache is the
  actual source of truth here, not local state.
- **`ClaimModal` is keyed by the target expense's id at the call site
  (`AppShell.tsx`), not reset via a `useEffect` inside it.** Originally
  written with two `useEffect`s (reset local state when the target
  expense changes; prune the selected claimant if the member list
  changes) — both got flagged by `react-hooks/set-state-in-effect`
  (calling a plain `useState` setter synchronously in an effect body).
  Fixed by (1) keying the whole component by expense id so switching
  targets remounts it with fresh `useState` initializers, the same
  `key`-based reset pattern `AddExpenseForm`/`ExpenseForm` already use
  for space-switching, and (2) deriving the _effective_ claimant during
  render (`selectedClaimantId` if it's still a member, else the first
  member) instead of syncing it via `setState`-in-effect. No behavior
  changed, no effects needed. **If a future phase's lint run flags this
  rule, this is the fix pattern — prefer `key`-based remount or a
  render-time derived value over an effect that calls `setState`.**
- **Real jsdom gap found and fixed: no `ResizeObserver`.** Radix's
  `Checkbox` (first used this phase, for the EQUAL/EXACT participant
  rows) calls `@radix-ui/react-use-size`, which constructs a
  `ResizeObserver` unconditionally in a layout effect — jsdom has no
  such global at all, so mounting any `Checkbox` threw `ResizeObserver
is not defined` before a single test could even render. Polyfilled
  with a no-op stub in `tests/setup.ts`, the standard fix for this
  exact gap (mirrors Phase 5's pointer-capture polyfill for the same
  underlying reason: jsdom implements a real DOM tree but not every
  browser API Radix's primitives assume exists).
- **Nested interactive elements caught and fixed before shipping**:
  `ExpenseList`'s row was originally a `<button>` wrapping the row's own
  Edit/Delete `<Button>`s — invalid HTML (nested buttons), and
  inconsistent across browsers/screen readers. Fixed by making the row
  a `div` with `role="button"`/`tabIndex={0}`/an Enter-or-Space
  `onKeyDown` handler instead, keeping the row itself keyboard-operable
  without nesting a real button inside a real button.
- **Claim mutations (`useCreateClaim`/`useDeleteClaim`) invalidate
  `queryKeys.expenses`, not a `queryKeys.claims` that doesn't exist.**
  `listAllExpenses` embeds each expense's claims directly (Phase 3's
  `ExpenseRelations`), so there's no separate claims query to keep in
  sync — invalidating expenses is what refetches them, exactly like
  `useCategoryMutations` invalidating `queryKeys.categories` covers
  everything `useLedger` derives from it.
- **The overclaim `confirm()` and every `alert()` in the original app's
  claimModal.js/expenseForm.js are gone**, replaced by an AlertDialog
  ("Log this claim anyway?") and `toast.error(...)` respectively, per
  ROADMAP.md's standing rule. Same treatment every prior phase's modals
  already got.

## Decisions made _during_ Phase 8 (not pre-decided — record these)

- **No schema or repository work this phase — `settlements.repository.ts`
  (create/update/delete) already existed since Phase 3, and
  `computeSettlements`/`buildBreakdown`/`sumBreakdown` already existed
  in the domain layer since Phase 2.** Both were fully unit-tested but
  never actually wired to any UI until now. Phase 8's entire scope was
  one `use*Mutations.ts` file and three components — the shortest
  phase since Phase 6, as anticipated before starting it.
- **`SettlementModal` is one Dialog serving both "Record a settlement"
  and "Edit settlement"**, exactly like the original app's
  settlementModal.js — `settlement === null` means create mode.
  Continues the "one shared component, parameterized by mode/nullable
  target" pattern `ExpenseForm.tsx` established in Phase 7, rather than
  building two near-identical modals.
- **"To" can never equal "from" in `SettlementModal`, enforced the same
  way the original app did**: picking a "from" that collides with the
  current "to" auto-reassigns "to" to a different member, and the "to"
  tag row's own item list always excludes whoever is currently "from" —
  so the invalid state (both pickers pointing at the same person) is
  structurally unreachable through the UI, not just rejected on submit
  (though `handleSave` still rejects it defensively if it somehow
  occurred).
- **`SettlementModal`/`BreakdownModal` are keyed by their target
  (a settlement id or "create"; a member id or "none") at the
  `AppShell.tsx` call site, exactly like Phase 7's `ClaimModal`/
  `ExpenseForm`** — local state (`fromId`/`toId`/`amountValue` in one,
  the date-range filter in the other) resets by remounting on a new
  target, never by an effect that calls `setState`. No new lint findings
  this phase because this pattern was already the default going in.
- **Real bug caught before shipping: two sibling modals in
  `AppShell.tsx` both fell back to the literal key `'none'` when
  closed** (`ClaimModal`'s `claimingExpenseId ?? 'none'` from Phase 7,
  and the new `BreakdownModal`'s `breakdownMemberId ?? 'none'`) —
  React warned about a duplicate key across siblings the moment both
  were mounted closed at once, which is the common case. Fixed by
  prefixing every modal's fallback key (`claim-`, `settlement-`,
  `breakdown-`) so no two sibling modals' key spaces can ever collide,
  regardless of what their underlying ids happen to be.
- **Balance cards, suggested-transfer rows, and recorded-settlement
  rows all resolve member names via `names.members[id] ?? id`
  (active+inactive), never just the active `members` roster** — a
  settlement or a lingering non-zero balance can reference a member
  who's since been removed (soft-deleted, Phase 5), and history must
  still render their name instead of a raw id. Only the balance-card
  _grid itself_ is limited to the current active roster (matching the
  original app exactly: a removed member's residual balance, if any,
  is still tracked in `computeBalances`'s output but never gets its own
  card).
- **`ExpenseForm.tsx`'s "one shared component, parameterized by mode"
  pattern and the `key`-based reset trick are confirmed reusable
  templates, not one-offs** — Phase 8 reused both without modification
  for `SettlementModal`, and PROJECT_STATE.md said as much would be
  expected before this phase started. Future phases needing a create/
  edit form or a target-scoped modal should reach for these two
  patterns first.

## Decisions made _during_ Phase 9 (not pre-decided — record these)

- **The category/payer charts are single-hue horizontal bar charts, not
  a multi-color categorical chart, and not a new charting library.**
  Before writing any chart code, loaded this session's `dataviz` skill,
  which frames the decision as "what's the data's job": comparing
  magnitude across labeled rows (spend per category, spend per payer)
  is a **sequential** job (one hue, more-is-more), not an **identity**
  job (which is what a categorical multi-hue palette is _for_ — telling
  otherwise-unlabeled series apart). Each bar already carries its own
  text label, so color was never doing identity work here, and a
  generated per-category hue would have been the "identity when the
  job is magnitude" anti-pattern the skill calls out explicitly. This
  also meant the palette validator script didn't apply (it's for
  categorical/diverging multi-hue palettes) — a single reused
  `bg-primary` needed no separate validation. Bars follow the skill's
  mark spec: track in `bg-muted`, fill in `bg-primary`, `rounded-full`,
  sorted descending, value labeled directly beside each bar rather than
  gated behind a hover tooltip (which the skill treats as an
  enhancement, never the only way to see a value that's already fully
  visible as a direct label).
- **The filter row sits above both charts, never nested inside one
  chart's card header** — the original app's `analyticsView.js` put its
  "Filter" button inside the "Spending" card's own header, even though
  the filter scopes the stats tiles AND both charts below it, not just
  that one card. The dataviz skill is explicit that filters are "one
  row, above the content they scope — never inside a chart card, never
  per-chart." Placed accordingly in `AnalyticsView.tsx`; a deliberate,
  skill-informed deviation from a literal port, not an oversight.
- **`DateRangeFilter.tsx` extracted from `BreakdownModal.tsx`
  (Phase 8) once `AnalyticsFilterModal` needed the identical
  preset-row + custom-dates picker** — same "don't duplicate a picker
  across screens" reasoning behind `TagRow`/`SplitParticipantRows`
  (Phase 7). Uses `useId()` for its custom-date inputs' ids rather than
  hardcoded strings: `AppShell.tsx` always mounts every modal (just
  closed), so two instances of this component can exist in the DOM at
  once, and a hardcoded id would collide. Lives in
  `features/settlements/` (its first consumer) and is imported
  cross-feature by `features/analytics/` — pragmatic, matching the
  project's existing precedent of importing `TagRow` from
  `features/expenses/` everywhere else, not a new "shared" directory
  invented this late for one component.
- **Real bug caught before shipping, found by the test suite, not
  review: selecting a non-custom preset must also close the filter
  dialog.** First implementation just applied every preset live and
  left the dialog open (matching how `BreakdownModal` behaves, where
  staying open is correct — the breakdown list is meant to be watched
  while adjusting the range). But `AnalyticsFilterModal` is a _modal
  picker_, not an always-visible panel: leaving it open after a
  same-screen preset click meant the next test's click on anything else
  failed with jsdom's `pointer-events: none` background-lock symptom —
  the exact class of bug `tests/setup.ts`'s scroll-lock reset was
  written for, except this time triggered by real, incorrect app
  behavior rather than test pollution. Fixed to match the original
  app's actual UX: a non-custom preset selection applies **and closes**
  the dialog (it's a complete choice on its own); only "custom" keeps
  it open, since it still needs two date fields filled in.
- **CSV export is always the full, unfiltered expense history**,
  exactly like the original app's `csvExport.js` — the on-screen date
  filter scopes the stats and charts only, never the download. Not
  scoping the export was a deliberate original-app decision (export is
  for "give me everything, I'll filter in a spreadsheet"), preserved
  as-is rather than "improved" into filter-scoped export nobody asked
  for.
- **`spendByCategory`/`spendByPayer` (new, `domain/analytics.ts`) key
  and sort their output by display _label_, not id** — a deliberate
  difference from `breakdown.ts`'s id-keyed `BreakdownRow`s. Analytics
  output has no further lookup to perform once a bar is drawn (unlike a
  breakdown row, which could in principle be re-associated with its
  source expense later), so resolving names once, inside the pure
  function itself, is simpler for every caller and keeps `AnalyticsView`
  from doing its own id→label mapping redundantly.
- **jsdom implements no `URL.createObjectURL`/`revokeObjectURL` at
  all** — confirmed directly (`typeof dom.window.URL.createObjectURL
=== 'undefined'`) before writing the CSV-export test, rather than
  discovering it via a failure. Mocked locally in
  `AnalyticsView.test.tsx` (`vi.stubGlobal('URL', ...)` +
  `vi.spyOn(HTMLAnchorElement.prototype, 'click')`), not in the global
  `tests/setup.ts` — unlike the `ResizeObserver` gap (Phase 7, needed
  by any Radix Checkbox anywhere in the app), this gap is narrowly
  scoped to the one CSV-download code path, so a global polyfill would
  be over-broad.
- **Not eyeballed in a real browser this phase either** (see the
  standing caveat every phase since Phase 4 has carried) — the bar
  charts' geometry, label collisions, and mobile layout at 375px-ish
  widths haven't been visually confirmed beyond what jsdom's DOM
  assertions can check. Worth a manual pass before Phase 10's
  responsive/accessibility audit, which will need one anyway.

## Decisions made _during_ the grouped-timeline feature (ad hoc, between Phase 9 and Phase 10)

Not a numbered ROADMAP.md phase — the user asked for this directly
after Phase 9 finished, before starting Phase 10. Scope was narrowed
up front via three targeted questions rather than assumed, since "a
grouped timeline for transaction history" was genuinely ambiguous
(whose transactions, what defines "in" vs "out", where does it live).
The user picked, for all three: **one member's own ledger** (not a
whole-space feed), **replacing `BreakdownModal`'s existing flat list**
(not a new screen), and **expenses + settlements only** (not claims as
their own rows).

- **"Money in" / "money out" is `BreakdownRow.amount`'s existing sign —
  no new domain math.** `buildBreakdown` already documents this exact
  semantic ("positive means the balance moved in the member's favour")
  and every other screen in the app already colors it the same way
  (`SettlementsView`'s "gets back"/"owes", the balance cards). This
  means the sign is a **balance-direction** concept, not a literal
  **cash-flow** one — receiving a settlement payment reduces what's
  owed _to_ you, which is a negative move in this sign convention even
  though cash literally arrived. The original app's own
  `breakdownModal.js` colored rows the identical way for the identical
  reason (it's the same `buildBreakdown` math, just newly grouped and
  iconified here) — this is a re-presentation of an existing, already-
  tested invariant, not a new behavior invented for this feature.
  `BreakdownModal.test.tsx`'s new "grouped timeline" tests assert this
  explicitly against the exact numbers, with the reasoning spelled out
  in a code comment, so it doesn't read as a bug on a future pass.
- **`groupBreakdownByDay` (new, `domain/breakdown.ts`) trusts
  `buildBreakdown`'s existing sort instead of re-sorting** — it just
  walks the already-newest-first rows and buckets contiguous same-date
  runs. Pure and unit-tested standalone, plus one test that runs it
  against `buildBreakdown`'s _real_ output to confirm the grouping
  never reorders anything.
- **`formatDayDivider` (new, `domain/dateRange.ts`) gives "Today"/
  "Yesterday" for recency, otherwise a full spelled-out weekday and
  date** (`toLocaleDateString('en-IN', { weekday: 'long', day:
'numeric', month: 'short', year: 'numeric' })`) — parses the date as
  local calendar fields (`new Date(year, month, day)`), never
  `new Date(isoString)`, for the exact UTC-offset reason `today()`'s
  own docblock already explains (a bare `YYYY-MM-DD` parses as UTC
  midnight, which displays as the previous day at any positive UTC
  offset, IST included). Test assertions pin the exact locale-formatted
  string (e.g. `'Wednesday, 1 Jan 2020'`) — this project already accepts
  that class of dependency on the runtime's ICU data (`formatCurrency`'s
  existing tests do the same for `₹` amounts), so this isn't a new kind
  of fragility.
- **Removed the redundant inline `· {date}` suffix from each row's
  detail line** — now that a day divider carries the date for every row
  under it, repeating it per-row was noise the grouping itself makes
  unnecessary. A genuine simplification the feature enabled, not a
  scope-creep change unrelated to the ask.
- **Added a `max-h-[50vh] overflow-y-auto` scroll region around the
  grouped rows** — day dividers make the list visually taller per
  entry than the old flat list was; a member with a long history could
  otherwise push the dialog's action buttons off-screen. Cheap
  robustness, not requested explicitly but a direct consequence of the
  UI actually being taller now.
- **Icons are `ArrowDownLeft` (in) / `ArrowUpRight` (out) in a
  `bg-positive/10`/`bg-negative/10` circle** — color alone was already
  the existing convention (`text-positive`/`text-negative` on the
  amount), but "distinct styling" was explicitly asked for, and this
  project has consistently treated color-alone encoding as worth
  strengthening with a second channel elsewhere (claim-done badges,
  balance-card status text alongside color) rather than relying on hue
  by itself.
- **Not eyeballed in a real browser** — same standing caveat as every
  phase since Phase 4; the day-divider/icon layout hasn't been visually
  confirmed on an actual mobile viewport. Same "do this in Phase 10's
  audit" note applies.

## Decisions made _during_ the recent-entries progressive-disclosure feature (ad hoc, right after the grouped-timeline one)

Another user-requested addition, not a numbered ROADMAP.md phase: only
`RECENT_ENTRIES_COLLAPSED_COUNT` (3) of "Recent entries" show at first,
with a single "Show N more" / "Show less" toggle button revealing or
re-hiding the rest.

- **One toggle button, not two separate "show"/"hide" buttons** — its
  label and action both flip based on `showAllRecent` state
  (`useState`, local to `ExpenseList`). Simpler than tracking a
  separately-dismissable "expanded" affordance, and there's no reason
  the same control shouldn't do both jobs.
- **The cap is still `RECENT_ENTRY_LIMIT` (25), unchanged.** Progressive
  disclosure only changes how much of what's _already loaded_ renders
  at once — it doesn't load more data, and doesn't touch the existing
  "at most 25 ever" ceiling the original app also had. "Show N more"
  reveals up to that same ceiling, never beyond it.
- **`ExpenseList` is now keyed by `activeSpaceId` in `AppShell.tsx`** —
  switching spaces remounts it, so the collapsed/expanded state (and
  the unrelated `deleteTarget` AlertDialog state) always starts fresh
  for the new space rather than carrying over. Same `key`-based-reset
  pattern this project settled on in Phase 7/8 for exactly this kind of
  "local UI state shouldn't survive a context switch" problem, applied
  here preemptively rather than after a bug report.
- **"Active claims" was deliberately left un-collapsed** — the user's
  ask was specifically about "Recent entries," and that list is
  usually short and time-sensitive (something needs claiming _now_),
  unlike "Recent entries" which can accumulate a long history. No
  reason to add a toggle nobody asked for to a list that doesn't have
  the problem being solved.

## Decisions made _during_ the expense-form refinements (ad hoc, right after the recent-entries feature)

Three small, user-requested changes to `ExpenseForm.tsx` (shared by
both `AddExpenseForm` and `EditExpenseSheet`, so all three apply to
editing too, not just adding):

- **The Note field is now required** (`expenseFormSchema.ts`:
  `z.string().trim().min(1, 'Describe what this payment was for.')`),
  with the "(optional)" dropped from its label and a standard inline
  error like every other required field. The user's rationale — a note
  is what the payment is actually _about_ — applies uniformly
  regardless of split type or mode, so this wasn't conditioned on
  anything. `describeExpense`'s/`ExpenseList`'s existing `expense.note
|| categoryLabel(...)` fallbacks were deliberately left in place: they
  still matter for historical rows created before this change (all of
  which — the user's own two expenses and the seeded demo data — happen
  to already have real notes, but nothing enforces that retroactively).
- **Ambiguity resolved before implementing**: "others tag should be in
  the last placement" was asked with a clarifying question rather than
  guessed at, since it could plausibly have meant either the "Other"
  _category_ or the "Manage" button's placement (which was already
  last). Confirmed: the category literally named "Other" should always
  render last in the tag row.
- **"Other" sorts last via a local, non-exported `withOtherLast()`
  helper in `ExpenseForm.tsx`** — a case-insensitive, trimmed name
  match, stable-sorted so every other category keeps its existing
  relative order. Deliberately scoped to _this picker's display order
  only_ — it does not touch the category's actual stored `position`,
  and `CategoriesModal`'s manage/reorder list is untouched, since a
  user directly managing category order should see the real order they
  set, not a silently reshuffled one. Not extracted into a shared/pure
  file: it's a single call site, and over-extracting a 5-line helper
  used exactly once would be the kind of premature abstraction this
  project avoids elsewhere.
- **The trailing "Manage" button is now visually distinct from the
  category pills**: a vertical divider (`bg-border` hairline) precedes
  it, it carries an icon (`Settings`), and it uses `variant="secondary"`
  instead of the pills' `outline`/`default` — so it reads as a
  different _kind_ of control (a navigation action) rather than an
  unselected category choice sitting in the same row. Covered by a test
  asserting the two controls' `data-variant` attributes actually
  differ, not just an eyeball check.

## Decisions made _during_ the claims-in-edit feature (ad hoc, right after the expense-form refinements)

The user noticed a real gap and asked "correct me if I'm wrong" — worth
recording the correction precisely, since the fix follows directly from
it. Their premise was that "Active claims" already shows who claimed
how much; it doesn't — it only shows an aggregate progress bar
("₹210 claimed · ₹490 remaining"). The actual gap was narrower and
worse: the _only_ place the per-person breakdown was ever visible
(`ClaimModal`'s tally) becomes unreachable the moment a claim expense
is fully claimed and moves to "Recent entries," because that list
always opens the edit sheet, never `ClaimModal` — and the edit sheet
showed nothing about claims at all. The fix: surface that same tally,
with a delete action, inside the edit sheet.

- **Extracted `ClaimsTally.tsx` out of `ClaimModal.tsx`** rather than
  writing a second, near-identical claims list inside `ExpenseForm.tsx`
  — the same "don't duplicate a picker across screens" reasoning
  already applied to `TagRow` (Phase 7), `SplitParticipantRows`
  (Phase 7), and `DateRangeFilter` (Phase 9). `ClaimModal` now renders
  `<ClaimsTally claims={claims} unitPrice={expense.unitPrice}
names={names} emptyText="..." />` instead of its old inline JSX —
  behavior-identical, confirmed by its existing test suite passing
  unchanged after the extraction.
- **`ExpenseForm` gained an optional `names?: NameLookup` prop**
  (default: an empty lookup), threaded through from `AppShell.tsx` via
  `EditExpenseSheet`. Optional, not required: `AddExpenseForm` (create
  mode) never has claim history to show — a brand-new expense has no
  claims yet regardless of split type — so forcing it to also carry a
  prop it would never use would be plumbing for its own sake. Only
  `EditExpenseSheet` actually supplies a real one.
- **The locked-claim edit view now shows a "Contributions" section**:
  a one-line "₹X of ₹Y claimed" summary (reusing `formatting.ts`'s
  existing `claimedTotal`, not a new calculation) plus the
  `ClaimsTally` list itself, right below the (still-editable) unit
  price field. The existing "new contributions are logged from the
  expense list, not here" note was reworded to "new" specifically,
  since this view can now remove existing ones.
- **No new mechanism was needed for "it goes back to Active claims"**
  — `ExpenseList` already recomputes its "Active claims"/"Recent
  entries" split fresh from live query data on _every_ render
  (`expense.splitType === CLAIM && unclaimed(expense) > 0.01`), and
  `useDeleteClaim` already invalidates the expenses query. Deleting a
  claim from the new UI just needed to exist — the reclassification was
  already correct, generic behavior from Phase 7, not something this
  feature had to build. No new test was added to re-prove that specific
  mechanism here; it's already covered by `ExpenseList.test.tsx`'s
  "puts a still-open claim in Active claims" test, and re-testing the
  same generic behavior through a different entry point would be
  redundant coverage, not more confidence.
- **Deleting a claim from the edit view has no confirmation dialog**,
  matching `ClaimModal`'s own pre-existing delete-claim button exactly
  (which also never confirmed). Every _other_ delete action in this
  app (members, categories, whole expenses, settlements) does confirm
  — but changing that for claims specifically, in only one of their two
  entry points, would create an inconsistency between "delete a claim
  from here" and "delete a claim from there" rather than resolve one.
  Left as-is deliberately, not an oversight; revisit both entry points
  together if this is ever reconsidered.

## Decisions made _during_ the settlements-show-more and overclaim-block feature (ad hoc, right after the claims-in-edit feature)

Two independent, small requests from the same message: mirror the
"Recent entries" show-more pattern onto "Record a settlement," and fix
a real bug in how `ClaimModal` handled overclaiming a quantity-based
claim.

- **`RECORDED_SETTLEMENTS_COLLAPSED_COUNT = 3`** added to
  `constants.ts` alongside `RECENT_ENTRIES_COLLAPSED_COUNT`, deliberately
  a _separate_ constant even though both are currently `3` — settlements
  have no analogous `RECENT_ENTRY_LIMIT` hard ceiling, so tying them to
  the same constant would couple two independently-tunable UI decisions
  that happen to share a value today.
- **`SettlementsView` gained the identical `showAllSettlements` state +
  slice + toggle-`Button` shape already used in `ExpenseList`** — same
  local-`useState` pattern, not a shared hook, matching the project's
  existing preference for duplicating a small amount of UI logic over
  introducing an abstraction for two call sites (see `ClaimsTally`'s own
  history for the _opposite_ call when a third consumer would have
  appeared instead of a second).
  `AppShell.tsx`'s `<SettlementsView>` gained `key={activeSpaceId}` for
  the same reason `<ExpenseList>` did: switching spaces must reset the
  collapse state, and remount-via-key is the established pattern for
  that (Phase 7/8), not an effect.
- **Removed the "Log this claim anyway?" `AlertDialog` from
  `ClaimModal.tsx` entirely.** The user's own worked example (a 10-unit,
  ₹10/unit claim with 9 already logged, then someone enters 6) showed
  the override actually let a claim exceed the expense's total — the
  dialog was framed as a soft confirmation but had no ceiling behind it.
  Replaced with a hard block: entering more than what's left now shows
  a `toast.error` and creates nothing, no override path offered.
- **The block message names the specific unit shortfall for
  quantity-based claims** (`"Only 1 unit remaining — enter 1 or fewer."`)
  rather than reusing the cash-amount message — computed as
  `remaining / unitPrice`, formatted via a small new `formatQty()`
  helper (trims trailing decimal zeros, e.g. `1.50` → `"1.5"`) since
  quantities aren't currency and shouldn't get `formatCurrency`'s ₹/paisa
  formatting. Cash-based claims keep a remaining-amount message instead
  (`"Only ₹700.00 remaining — enter that amount or less."`), matching
  the distinction the unit-priced UI already draws elsewhere (quantity
  input + per-unit hint vs. plain amount input).
- **No new confirmation dialog was added for the block itself** — a
  hard validation failure that prevents submission doesn't need a
  confirm/cancel choice the way an _overridable_ action would; this is
  consistent with every other inline-validation error in this form
  (e.g. "Select who is claiming.", "Enter a valid quantity.") already
  using a plain toast, not a dialog.

## Decisions made _during_ Phase 10 (not pre-decided — record these)

ROADMAP.md's scope for this phase: "PWA manifest/icons, an accessibility
pass, responsive/mobile QA, a loading/empty/error-state audit, one
Playwright smoke test, and deployment docs." Unlike every prior phase,
nothing here was a new feature — it was verifying and hardening what
the previous 9 phases (plus five ad-hoc additions) already built, and
it surfaced two genuinely new bugs in the process.

- **The live-Supabase-auth browser check could not be scripted.** Every
  phase since Phase 4 deferred "click through the real app in a real
  browser against the live project" to Phase 10. Attempting it with an
  automated headless browser hit two real constraints on the live
  project: sign-up requires email confirmation (no session is returned
  until the email link is clicked), and Supabase's default email sender
  has a very low rate limit (a couple of sends per hour). Writing
  directly into `auth.users`/`auth.identities` via raw SQL to fake a
  confirmed account was considered and rejected — too invasive a
  workaround for a live project's managed auth schema without asking
  first. This is now a documented manual step in `DEPLOYMENT.md` rather
  than an automated test, and `playwright.config.ts` explains the same
  reasoning at the top of the file.
- **The Playwright smoke test therefore covers the public routes, not a
  signed-in session** — `/`'s redirect to `/login`, both auth forms'
  client-side validation (asserting _zero_ requests to
  `/auth/v1/*` before submission, so the test can't accidentally hit
  live rate limits either), an axe-core accessibility scan of both
  pages, that the new PWA manifest/icons actually resolve from a real
  build, and a no-horizontal-overflow check. This is a deliberately
  different (smaller, but still real-browser, real-build) scope than
  "full E2E against production," chosen so the test is deterministic
  and safe to run repeatedly without polluting the live project with
  throwaway signups.
- **Two real accessibility bugs surfaced from the axe scan and were
  fixed, not suppressed.** Neither `SignInPage`, `SignUpPage`, nor
  `ComingSoon` had a `<main>` landmark or an `<h1>` — all three now wrap
  their content in `<main>` with a `<h1 className="sr-only">` naming the
  page (visual design unchanged; `CardTitle` still shows the visible
  title). Fixing this exposed a second, latent bug: `card.tsx`'s
  `CardTitle` was hardcoded to `<h3>` with a comment reasoning "the
  app's own h1 is the page title... one level down" — but one level
  below h1 is h2, not h3, so axe's `heading-order` rule correctly
  flagged the skip. `CardTitle` is now `<h2>` (comment corrected too).
  No test anywhere asserted the specific heading level, so this was
  safe to change globally in the one shared component rather than
  patching each page.
- **A real error-handling gap in `useSpaces`/`useLedger`**: neither
  hook ever surfaced `isError` from its underlying queries — a real
  query failure (network error, RLS misconfiguration, etc.) would
  silently render as "zero spaces" or an empty ledger, indistinguishable
  from a genuinely new, empty account. Both hooks now expose `isError`;
  `AppShell.tsx` branches on `spacesError` with a real "Something went
  wrong loading your spaces" message plus a Reload button (instead of
  the infinite "Setting up your space…" spinner a failed spaces-query
  used to produce, since `isLoading` and `!activeSpaceId` were the only
  two states it checked), and on `ledgerError` with an inline message
  below the tab content once a space has loaded. Covered by three new
  focused tests (`useSpaces.error.test.tsx`, `useLedger.error.test.tsx`,
  `AppShellError.test.tsx`) that mock one repository function to reject
  rather than extending the shared `fakeSupabase` helper with generic
  error-injection — that helper is used by 41 other test files, and
  adding error-simulation surface to it for three tests wasn't worth
  the shared-fixture risk.
- **PWA icons were rasterized from the existing `favicon.svg`**, not
  hand-designed — a throwaway Playwright script (chromium screenshot of
  an HTML page embedding the SVG at each target size, not committed to
  the repo) produced `icon-192.png`, `icon-512.png`,
  `maskable-icon-512.png` (50% mark-to-canvas ratio for the maskable
  safe zone), and `apple-touch-icon.png`. `theme-color` uses the logo's
  own purple (`#863bff`, from the SVG's fill) rather than the app's
  button-accent blue (`#2563eb`) — the former is the actual brand mark,
  the latter is just a UI accent color for interactive elements. No
  service worker was added; the manifest/icons make the app installable
  but not offline-capable — see `DEPLOYMENT.md`'s "PWA scope" for why
  that's a deliberate, smaller scope for now.
- **Responsive/mobile QA was a code review, not a fresh redesign** — the
  app was already mobile-first (bottom `TabBar`, `Sheet`/`Dialog`
  patterns, `AppShell`'s `mx-auto max-w-md` single-column container),
  and grepping for fixed pixel widths or wide (`grid-cols-3`+) grids
  across `src/features`/`src/routes` found none. The Playwright suite's
  `mobile` project (Pixel 7 dimensions, Chromium-based — WebKit was
  never installed and iPhone-device emulation needs it) exercises the
  same public-page checks at a real mobile viewport as a concrete,
  automated backstop for this, rather than a one-time manual claim.
- **`CardTitle`'s heading level change (h3 → h2) was applied once, in
  the shared component** — every card in the app (Balances, Suggested
  settlements, Record a settlement, every modal's header, etc.) picks
  up the corrected heading order automatically. This is the same
  "fix it once in the shared primitive" reasoning the component's own
  comment already documented for div → h-tag in an earlier phase.

## Exact dependency versions installed

Dependencies:
`@fontsource-variable/geist@^5.3.0`, `@hookform/resolvers@^5.9.1`,
`@supabase/supabase-js@^2.116.0` (added Phase 3), `@tailwindcss/vite@^4.3.3`,
`@tanstack/react-query@^5.103.1`, `class-variance-authority@^0.7.1`,
`cn@^0.3.0`, `lucide-react@^1.47.0`, `next-themes@^0.4.6`, `radix-ui@^1.6.7`,
`react@^19.2.8`, `react-dom@^19.2.8`, `react-hook-form@^7.88.0`,
`react-router-dom@^7.18.4`, `shadcn@^4.21.0`, `sonner@^2.0.8`,
`tailwindcss@^4.3.3`, `tw-animate-css@^1.4.0`, `zod@^4.6.5`.

Dev dependencies:
`@eslint/js@^10.0.1`, `@testing-library/jest-dom@^7.0.1`,
`@testing-library/react@^16.3.3`, `@testing-library/user-event@^14.6.7`,
`@types/node@^24.13.3`, `@types/react@^19.2.18`,
`@types/react-dom@^19.2.7`, `@vitejs/plugin-react@^6.1.1`,
`@vitest/ui@^5.0.1`, `eslint@^10.10.0`, `eslint-config-prettier@^10.1.8`,
`eslint-plugin-react-hooks@^7.1.1`, `eslint-plugin-react-refresh@^0.5.7`,
`globals@^17.12.0`, `jsdom@^30.1.0`, `prettier@^3.9.8`,
`typescript@~6.0.2`, `typescript-eslint@^8.70.0`, `vite@^8.3.0`,
`vitest@^5.0.1`, `@playwright/test@^1.63.0` (Phase 10),
`@axe-core/playwright@^4.13.0` (Phase 10).

Playwright's Chromium browser binary is downloaded separately via
`npx playwright install chromium` (not an npm dependency — a one-time
per-machine download into `~/.cache/ms-playwright`). WebKit/Firefox
were never installed; the `mobile` project uses a Chromium-based device
profile instead (see "Decisions made during Phase 10").

Node/npm used to build this: Node v24.20.0, npm 11.19.0.

## Phase log

| Phase                                 | Status                    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Project scaffolding & tooling      | **Complete** (2026-09-18) | All verification commands green (see below).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2. Domain logic                       | **Complete** (2026-09-18) | 52/52 tests passing. Identity model changed to ids (see "Decisions made during Phase 2") — this is the one deviation from a pure port.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3. Supabase backend & auth foundation | **Complete** (2026-09-18) | 82/82 tests passing (30 new) AND verified live against a real Supabase project (schema applied, RLS/auth/cascade-delete exercised end to end, security advisors clean). See "Live project verification."                                                                                                                                                                                                                                                                                                                                                                               |
| 4. App shell & navigation             | **Complete** (2026-09-18) | 101/101 tests passing (19 new). Real query layer + active-space bootstrap + ledger assembly, wired to the live project. Fixed a real gap in expenses/settlements grouping and a real a11y gap in shadcn's CardTitle. See "Decisions made during Phase 4."                                                                                                                                                                                                                                                                                                                              |
| 5. Spaces & Members                   | **Complete** (2026-09-18) | 119/119 tests passing (18 new). Full CRUD for spaces (create/rename/delete) and members (add/rename/soft-delete). Fixed a real schema gap (members' hard-delete constraint) and a real a11y gap. See "Decisions made during Phase 5."                                                                                                                                                                                                                                                                                                                                                  |
| 6. Categories                         | **Complete** (2026-09-18) | 131/131 tests passing (12 new). Full CRUD + reorder for categories (add/rename/soft-delete/move up-down). Fixed a real schema gap (categories' silent-cascade data loss on delete). Reorder uses accessible buttons, not drag-and-drop. See "Decisions made during Phase 6."                                                                                                                                                                                                                                                                                                           |
| 7. Expenses                           | **Complete** (2026-09-19) | 195/195 tests passing (64 new). Add/edit form (RHF+Zod, EQUAL/EXACT/CLAIM), expense list with Active claims + Recent entries, full claim flow (log/delete/overclaim-block — the original "overclaim-confirm" AlertDialog was replaced with a hard block after the ad-hoc settlements-show-more/overclaim-block feature found it let claims exceed the total; see that feature's decisions section). Found and fixed 3 real bugs before shipping (stale snapshot in AppShell, nested buttons, setState-in-effect) plus a jsdom ResizeObserver gap. See "Decisions made during Phase 7." |
| 8. Settlements                        | **Complete** (2026-09-19) | 219/219 tests passing (24 new). Balances, suggested transfers, record/edit/delete settlement, per-member breakdown modal with date filters. No schema/repository work needed — pure math and repository layer already existed since Phase 2/3. Fixed a real duplicate-React-key bug across sibling modals before shipping. See "Decisions made during Phase 8."                                                                                                                                                                                                                        |
| 9. Analytics                          | **Complete** (2026-09-20) | 244/244 tests passing (25 new). Date filter, total/entries stats, spend-by-category and spend-by-member bar charts (new `domain/analytics.ts`), CSV export (new `domain/csvExport.ts`). No new charting library — single-hue bar charts, per the `dataviz` skill's "compare magnitude" guidance. Found and fixed a real filter-dialog-doesn't-close bug via the test suite. ROADMAP.md's full 9-phase feature list is now built. See "Decisions made during Phase 9."                                                                                                                  |
| 10. Polish & release readiness        | **Complete** (2026-09-20) | 279/279 Vitest tests passing (10 new) + 10/10 Playwright tests (new). PWA manifest/icons, one Playwright smoke test (real browser, real build, automated a11y scan), a fixed real accessibility gap (no `<main>`/`<h1>` on the auth pages) and a fixed real error-handling gap (query failures were silently indistinguishable from "empty"), a responsive/mobile code review, and `DEPLOYMENT.md`. The live-browser check against real Supabase auth remains a manual step — see "Decisions made during Phase 10" for why it can't be scripted reliably.                              |

## Verification commands run for Phase 1 (all green)

```
npm run typecheck   # tsc -b — clean
npm run lint         # eslint src tests — clean
npm test             # vitest run — 2/2 passing
npm run build        # tsc -b && vite build — succeeds, dist/ produced
npm run dev          # booted manually on :5183, HTTP 200 on / and
                      # /src/main.tsx, no errors in dev-server log
```

## Verification commands run for Phase 2 (all green)

```
npm run format       # prettier --write — reformatted new files, no errors
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean
npm test              # vitest run — 52/52 passing (5 test files)
npm run build         # tsc -b && vite build — succeeds
```

## Verification commands run for Phase 3 (all green)

```
npm run format       # prettier --write — clean
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean
npm test              # vitest run — 82/82 passing (11 test files)
npm run build         # tsc -b && vite build — succeeds (~750 KB JS / 223 KB
                      # gzipped — @supabase/supabase-js pushed it past
                      # Vite's 500 KB chunk-size warning; not addressed
                      # now, flagged for Phase 10's polish pass)
npm run dev          # booted manually, GET /, /login, and the transformed
                      # /src/main.tsx all HTTP 200, no errors in the
                      # dev-server log
```

## Live project verification (done after Phase 3's initial pass, via the

## Supabase MCP server)

Phase 3 was originally built and tested entirely against `fakeSupabase.ts`,
with no live Supabase project available (see git history / earlier
revisions of this file). Once the user connected the Supabase MCP server
and an organization ("Orville-Labs's Org") with an existing empty project
("Splitter-2.0", `gqsqdguwhfsumbwrhopj`, ap-southeast-1, Postgres 17)
became visible, the following was done for real, directly against that
project:

1. **Applied all three original migrations** via `apply_migration`, in
   order. All succeeded on the first try.
2. **Ran `get_advisors`** (security + performance) immediately after —
   this is what a fresh Postgres can catch that `fakeSupabase.ts` never
   could. Found and fixed for real:
   - `handle_new_user()` and the original `public.is_space_owner()` were
     both reachable via `/rest/v1/rpc/...` by `anon`/`authenticated` —
     Supabase grants `EXECUTE` on new public-schema functions to both
     roles by default, which the original migrations' `revoke ... from
public` did not account for (`REVOKE ... FROM PUBLIC` does not undo
     a role-specific grant). Fixed in
     `20260918130000_advisor_fixes.sql` (revoke from `handle_new_user`
     entirely; revoke `is_space_owner` from `anon` only, since
     `authenticated` genuinely needs it for RLS).
   - Two missing covering indexes on `settlements.from_member_id`/
     `to_member_id`. Added.
   - Three RLS policies (`profiles_select_self`, `profiles_update_self`,
     `spaces_owner_all`) called bare `auth.uid()`, re-evaluated per row
     instead of once per query. Fixed with the `(select auth.uid())`
     pattern.
   - Remaining after that: `is_space_owner` still directly callable by
     `authenticated` via RPC — a "do I own space X" boolean oracle, low
     severity but real. Fixed by moving it to a `private` schema
     (`20260918130100_move_is_space_owner_to_private_schema.sql`) —
     PostgREST only routes RPCs for schemas it's configured to expose
     (normally just `public`), so this removes it from that surface
     entirely without breaking RLS (Postgres checks the calling role's
     own privileges for functions referenced inside a policy regardless
     of PostgREST's schema-exposure config, which is an HTTP-routing
     concept, not a privilege one — `authenticated` still has `USAGE`
     on `private` and `EXECUTE` on the function). **Security advisor is
     now fully clean (`[]`).**
   - One remaining WARN that is **not** SQL-fixable: "Leaked Password
     Protection Disabled" — a Supabase Auth _service_ setting (checks
     new passwords against HaveIBeenPwned), toggled in the dashboard
     under Authentication → Policies, not via migration. **Left for the
     user to enable manually** — noted in Open items.
   - Both new migration files were also written back to
     `supabase/migrations/` so the local repo matches what's actually
     live.
3. **Generated real TypeScript types** via `generate_typescript_types`
   and replaced the hand-written `database.types.ts` wholesale (per the
   original "hand-written now, codegen once a project exists" plan).
   This surfaced the generator's one real known limitation: function
   **argument** nullability isn't modeled (table column nullability is,
   function args aren't), so `create_expense`/`update_expense`'s
   generated `Args` types claimed `p_unit_price: number` and
   `p_participant_ids: string[]` were never `null`, when the SQL
   genuinely accepts null for a CLAIM/EXACT expense. Fixed with one
   explicit, commented `nullable<T>()` cast helper at the four call
   sites in `expenses.repository.ts` — not a schema problem, a codegen
   limitation, so casting at the boundary is correct rather than
   fighting the generated types.
4. **Full auth+RLS chain exercised for real**, not just simulated:
   signed up a test user via the real `/auth/v1/signup` endpoint (the
   `handle_new_user` trigger fired correctly — `profiles` row appeared
   with the right `display_name` pulled from signup metadata); discovered
   this project has **email confirmation required** (sign-in fails with
   `email_not_confirmed` until confirmed — matches what `SignUpPage`'s
   success toast already told the user to expect, good foresight, no
   code change needed); manually confirmed the test user's email via SQL
   to unblock the rest of the test; signed in for a real access token;
   created a real space as that authenticated user via PostgREST
   (`201`); confirmed `anon` reading the same endpoint got an **empty
   array with `200`**, not a hard error — which led to the next finding.
5. **Found and fixed a real defense-in-depth gap**: querying
   `information_schema.role_table_grants` showed `anon` had full
   SELECT/INSERT/UPDATE/DELETE (plus TRUNCATE/REFERENCES/TRIGGER) grants
   on **every** table — a Supabase default-project-provisioning behavior
   neither original migration accounted for (the comment "anon gets
   nothing" was aspirationally true at the RLS-policy level but false at
   the grant level). RLS was correctly blocking all actual anon data
   access the whole time (confirmed empirically — anon got zero rows,
   never real data), but this left RLS as the _only_ barrier: if it were
   ever accidentally disabled on a table, anon would have had
   unrestricted access instantly. Fixed with
   `20260918130200_revoke_anon_table_grants.sql` (applied live, then
   written back to the local migration folder): confirmed anon now gets
   a hard `42501 permission denied` on both SELECT and INSERT, while
   `authenticated` (the real owner) is unaffected.
6. **Cleaned up** the test user and space — `delete from auth.users`
   cascaded correctly through both `profiles` and `spaces` (both
   reached 0 rows for that id afterward, verified by query). Project is
   back to a genuinely empty 10-table, 0-row, RLS-enabled state.
7. **`.env`** now holds the real project URL and anon key (was
   placeholders through the rest of Phase 3).

**What this means for confidence going forward:** the schema, RLS, both
custom RPCs, the profile-bootstrap trigger, and the full sign-up → email
confirmation → sign-in → owned-row-access → anon-denied → cascade-delete
chain have now all been exercised against a real Postgres + real
Supabase Auth, not simulated. This is meaningfully stronger than Phase
3's original close-out state.

## Verification commands run for Phase 4 (all green)

```
npm run format       # prettier --write — clean
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean (one real warning fixed
                      # along the way, not suppressed — see Phase 4 notes
                      # on useSpaces's memoized `spaces` array)
npm test              # vitest run — 101/101 passing (16 test files)
npm run build         # tsc -b && vite build — succeeds (~856 KB JS / 257 KB
                      # gzipped; growing as expected, still flagged for
                      # Phase 10, not addressed now)
npm run dev          # booted manually, GET /, /login, and the transformed
                      # /src/routes/AppShell.tsx all HTTP 200, no errors in
                      # the dev-server log
```

Not yet verified: the actual app shell against the _live_ Supabase
project in a real browser (only against `fakeSupabase.ts` in tests, and
a dev-server boot that doesn't exercise a real signed-in session). The
Phase 3 live-verification pass proved auth+RLS work for real; Phase 4's
UI logic (bootstrap, ledger assembly, tab switching) is proven only by
the test suite so far. Worth a manual browser pass — sign up, get
auto-bootstrapped into "My Group", switch tabs, open the spaces sidebar —
whenever convenient, not blocking.

## Verification commands run for Phase 5 (all green)

```
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean
npm test              # vitest run — 119/119 passing (20 test files)
npm run build         # tsc -b && vite build — succeeds (~870 KB JS / 260 KB
                      # gzipped; chunk-size warning persists, still
                      # deferred to Phase 10)
npm run dev          # booted manually, GET / returned HTTP 200, no errors
                      # in the dev-server log
```

The `20260919090000_members_soft_delete.sql` migration was applied live
to the "Splitter-2.0" project via the Supabase MCP server and confirmed
clean with `get_advisors` (no new lints introduced).

Not yet verified: the new spaces/members CRUD flows against the _live_
Supabase project in a real browser (only against `fakeSupabase.ts` in
tests) — same caveat as Phase 4, still not blocking.

## Verification commands run for Phase 6 (all green)

```
npm run format       # prettier --write — reformatted new files, no errors
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean
npm test              # vitest run — 131/131 passing (23 test files)
npm run build         # tsc -b && vite build — succeeds (~875 KB JS / 261 KB
                      # gzipped; chunk-size warning persists, still
                      # deferred to Phase 10)
npm run dev          # booted manually, GET / returned HTTP 200, no errors
                      # in the dev-server log
```

The `20260919090100_categories_soft_delete.sql` migration was applied
live to the "Splitter-2.0" project via the Supabase MCP server and
confirmed clean with `get_advisors` (security: `[]`; performance:
pre-existing "unused index" INFO notices on an empty project, unrelated
to this change).

Not yet verified: the new categories CRUD/reorder flow against the
_live_ Supabase project in a real browser (only against
`fakeSupabase.ts` in tests) — same caveat as Phases 4/5, still not
blocking.

## Verification commands run for Phase 7 (all green)

```
npm run format       # prettier --write — reformatted new files, no errors
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean (0 errors; 1 expected
                      # warning — react-hooks/incompatible-library on
                      # ExpenseForm.tsx's use of RHF's watch(), which
                      # the React Compiler can't safely memoize around;
                      # not fixable without dropping watch() entirely,
                      # and not a correctness issue)
npm test              # vitest run — 195/195 passing (32 test files)
npm run build         # tsc -b && vite build — succeeds (~905 KB JS / 268 KB
                      # gzipped; chunk-size warning persists, still
                      # deferred to Phase 10)
npm run dev          # booted manually, GET / returned HTTP 200, no errors
                      # in the dev-server log
```

No schema/migration changes this phase — `create_expense`/
`update_expense`/claims already existed from Phase 3; Phase 7 only
added the query-hook and UI layers on top, so there was nothing to
apply via the Supabase MCP server this time.

Not yet verified: the new expense/claim flow against the _live_
Supabase project in a real browser (only against `fakeSupabase.ts` in
tests) — same caveat as every prior phase, still not blocking. Worth
doing before Phase 8, since Settlements' balance math depends on
expenses/settlements data that's now actually written by real UI for
the first time.

## Verification commands run for Phase 8 (all green)

```
npm run format       # prettier --write — reformatted new files, no errors
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean (0 errors; the same 1
                      # expected warning from Phase 7 on ExpenseForm.tsx's
                      # watch() usage, unrelated to this phase)
npm test              # vitest run — 219/219 passing (36 test files)
npm run build         # tsc -b && vite build — succeeds (~916 KB JS / 270 KB
                      # gzipped; chunk-size warning persists, still
                      # deferred to Phase 10)
npm run dev          # booted manually, GET / returned HTTP 200, no errors
                      # in the dev-server log
```

No schema/migration changes this phase — `settlements.repository.ts`
already existed from Phase 3; Phase 8 only added the query-hook and UI
layers on top, so there was nothing to apply via the Supabase MCP
server this time (same situation as Phase 7).

Not yet verified: the new settlement/breakdown flow against the _live_
Supabase project in a real browser (only against `fakeSupabase.ts` in
tests) — same caveat as every prior phase, still not blocking.

## Verification commands run for Phase 9 (all green)

```
npm run format       # prettier --write — reformatted new files, no errors
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean (0 errors; the same 1
                      # expected warning from Phase 7 on ExpenseForm.tsx's
                      # watch() usage, unrelated to this phase)
npm test              # vitest run — 244/244 passing (40 test files)
npm run build         # tsc -b && vite build — succeeds (~921 KB JS / 271 KB
                      # gzipped; chunk-size warning persists, still
                      # deferred to Phase 10)
npm run dev          # booted manually, GET / returned HTTP 200, no errors
                      # in the dev-server log
```

No schema/migration changes this phase — Analytics reads only from
data already loaded via `useLedger` (expenses, already fetched);
nothing new to apply via the Supabase MCP server.

Not yet verified: the new Analytics tab (filter, charts, CSV export)
against the _live_ Supabase project in a real browser, and not
eyeballed for layout/label-collision issues either (see "Decisions
made during Phase 9") — same caveat as every prior phase, still not
blocking, but Phase 10's responsive/accessibility audit should finally
close this out across every phase at once rather than one phase at a
time.

## Verification commands run for the grouped-timeline feature (all green)

```
npm run format       # prettier --write — reformatted new files, no errors
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean (0 errors; same 1
                      # expected warning as every phase since 7, unrelated)
npm test              # vitest run — 255/255 passing (40 test files, 11 new)
npm run build         # tsc -b && vite build — succeeds (~922 KB JS / 272 KB
                      # gzipped; chunk-size warning persists, still
                      # deferred to Phase 10)
npm run dev          # booted manually, GET / returned HTTP 200, no errors
                      # in the dev-server log
```

No schema/migration changes — purely a presentation layer change over
data `useLedger` already loads. Not yet eyeballed in a real browser
(see its own decisions section above) — same standing caveat, folded
into Phase 10's audit like everything else.

## Verification commands run for the recent-entries progressive-disclosure feature (all green)

```
npm run format       # prettier --write — reformatted changed files, no errors
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean (0 errors; same 1
                      # expected warning as every phase since 7, unrelated)
npm test              # vitest run — 258/258 passing (40 test files, 3 new)
npm run build         # tsc -b && vite build — succeeds (~922 KB JS / 272 KB
                      # gzipped; chunk-size warning persists, still
                      # deferred to Phase 10)
```

No schema/migration changes — a UI-only change plus one new constant.

## Verification commands run for the expense-form refinements (all green)

```
npm run format       # prettier --write — reformatted changed files, no errors
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean (0 errors; same 1
                      # expected warning as every phase since 7, unrelated)
npm test              # vitest run — 263/263 passing (40 test files, 5 new)
npm run build         # tsc -b && vite build — succeeds (~923 KB JS / 272 KB
                      # gzipped; chunk-size warning persists, still
                      # deferred to Phase 10)
npm run dev          # booted manually, GET / returned HTTP 200, no errors
                      # in the dev-server log
```

No schema/migration changes. The live demo data's expenses (below) all
already have real notes, so this change doesn't strand any of it in an
invalid state.

## Verification commands run for the claims-in-edit feature (all green)

```
npm run format       # prettier --write — reformatted changed files, no errors
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean (0 errors; same 1
                      # expected warning as every phase since 7, unrelated)
npm test              # vitest run — 272/272 passing (41 test files, 9 new)
npm run build         # tsc -b && vite build — succeeds (~924 KB JS / 272 KB
                      # gzipped; chunk-size warning persists, still
                      # deferred to Phase 10)
npm run dev          # booted manually, GET / returned HTTP 200, no errors
                      # in the dev-server log
```

No schema/migration changes — a UI-only change (`ClaimModal.tsx`
refactored to use the new shared `ClaimsTally.tsx`, `ExpenseForm.tsx`/
`EditExpenseSheet.tsx`/`AppShell.tsx` threading a `names` prop through).
The live demo data's "Eggs" (fully claimed) and "Bananas" (partially
claimed) expenses are good ready-made cases for trying this by hand —
edit either one and the Contributions section should show real claim
rows immediately.

## Verification commands run for the settlements-show-more and overclaim-block feature (all green)

```
npm run format       # prettier --write — reformatted ClaimModal.tsx after
                      # its AlertDialog removal, no errors
npm run typecheck    # tsc -b — clean
npm run lint          # eslint src tests — clean (0 errors; same 1
                      # expected warning as every phase since 7, unrelated)
npm test              # vitest run — 276/276 passing (41 test files)
npm run build         # tsc -b && vite build — succeeds (~924 KB JS / 273 KB
                      # gzipped; chunk-size warning persists, still
                      # deferred to Phase 10)
npm run dev          # booted manually, GET / returned HTTP 200, no errors
                      # in the dev-server log
```

No schema/migration changes — UI-only (`SettlementsView.tsx`,
`AppShell.tsx`, `ClaimModal.tsx`, `constants.ts`). The live demo data's
"Bananas" expense (₹10/unit, 5 of 15 claimed) is a ready-made case for
trying the new overclaim block by hand: open its claim sheet and enter
a quantity above 10.

## Verification commands run for Phase 10 (all green)

```
npm run format        # prettier --write over the whole repo — reformatted
                       # DEPLOYMENT.md's table and a couple of test files,
                       # no errors
npm run format:check  # confirms the above — clean
npm run typecheck     # tsc -b (src + tests + e2e, via 3 project references
                       # now — see tsconfig.e2e.json) — clean
npm run lint           # eslint src tests e2e playwright.config.ts — clean
                       # (0 errors; same 1 expected warning as every phase
                       # since 7, unrelated)
npm test               # vitest run — 279/279 passing (44 test files, 3 new:
                       # useSpaces.error, useLedger.error, AppShellError)
npm run test:e2e       # playwright test — 10/10 passing (5 specs x
                       # desktop+mobile projects), including the axe-core
                       # accessibility scan
npm run build          # tsc -b && vite build — succeeds; dist/ confirmed
                       # to contain manifest.webmanifest + all 4 icon PNGs,
                       # and index.html confirmed to reference them
npm run dev            # booted manually, GET / returned HTTP 200, no
                       # errors in the dev-server log
```

No schema/migration changes — this phase touched build/tooling config
(`playwright.config.ts`, `tsconfig.e2e.json`, `vite.config.ts`,
`eslint.config.js`, `package.json`, `.gitignore`), the PWA files
(`index.html`, `public/manifest.webmanifest`, `public/*.png`), three
components (`SignInPage.tsx`, `SignUpPage.tsx`, `ComingSoon.tsx` gained
`<main>`+`<h1>`; `card.tsx`'s `CardTitle` gained a corrected heading
level), two query hooks (`useSpaces.ts`, `useLedger.ts` gained
`isError`), `AppShell.tsx` (new error-state branches), and new test/docs
files (`e2e/smoke.spec.ts`, three new Vitest files, `DEPLOYMENT.md`).

## Live demo data

At the user's request, seeded realistic demo data into the actual live
"My Group" space (`eaa8d861-ea61-4023-ba6a-057af465927c` in the
"Splitter-2.0" project) using its real members (Kavin, Kishore, Mohan)
and default categories, via direct `create_expense`/`claims`/
`settlements` SQL through the Supabase MCP server — additive only,
nothing existing was modified or deleted (the user's own two
manually-created expenses, "Petrol" and "Advance," and their one
existing settlement, were left untouched). Confirmed clean with
`get_advisors` afterward (only the pre-existing, already-documented
"Leaked Password Protection" WARN, unrelated).

Added, spread across 2026-09-14 through 2026-09-20 to exercise the
date filters and the grouped-timeline day dividers:

- **Groceries** ₹450 (EQUAL, Mohan paid, all 3 split it evenly)
- **Eggs** ₹210 (CLAIM, ₹7/unit, Kavin paid) — **fully claimed** by
  Kishore + Mohan, to exercise the "Claimed" badge / Recent-entries path
- **Movie tickets** ₹900 (EQUAL, Kavin paid, clean 3-way split)
- **Water bottles** ₹250 (EXACT, Mohan paid, uneven Kavin/Kishore split,
  Mohan excluded himself)
- **Snacks** ₹100 (EQUAL, Kishore paid) — **deliberately indivisible by
  3** (₹33.33 each), the exact paisa-rounding scenario discussed with
  the user right before this
- **Bananas** ₹150 (CLAIM, ₹10/unit, Mohan paid) — **only partially
  claimed** (Kavin claimed 5 of 15 units), to exercise "Active claims"
  and its progress bar
- **Misc** ₹90 (EQUAL, Kishore paid, **no category**) — exercises the
  "Uncategorized" bucket in Analytics
- **A settlement**, Kishore → Kavin ₹200 — **deliberately a partial
  payment**, not scoped to fully clear what Kishore actually owes, to
  demonstrate that settlements track a real remainder rather than
  writing off a debt (ties directly to the paisa-rounding/partial-
  payment question the user asked just before requesting this data)

This is real data in the real project, not a fixture — if it's ever no
longer wanted (e.g. before a real user signs up), it should be deleted
explicitly rather than assumed gone; nothing currently cleans it up
automatically.

## Open items / things the next phase should know

- **Nothing has been committed to git yet.** `git init` has run; the
  working tree is clean of `.git` history. The user should review and
  make the first commit themselves (or explicitly ask for one) — do not
  commit without being asked, per this session's standing git-safety
  rule.
- **A live Supabase project now exists and is fully wired up** —
  "Splitter-2.0" (`gqsqdguwhfsumbwrhopj`, org "Orville-Labs's Org",
  ap-southeast-1). All 6 migrations are applied, `.env` has the real URL
  and anon key, and the full auth+RLS chain was verified for real (see
  "Live project verification" above). The project is currently empty
  (0 rows in every table) — the test user/space created during
  verification were deleted afterward.
- **One security setting can't be fixed via migration**: "Leaked
  Password Protection" is disabled for this project. It's a Supabase
  Auth dashboard toggle (Authentication → Policies), not a SQL/RLS
  concern — enable it there when convenient, it's not blocking any
  phase. Now also listed in `DEPLOYMENT.md` alongside a second,
  Phase-10-discovered dashboard setting worth fixing before real
  signups: the default email sender's very low rate limit (a custom
  SMTP provider fixes this — Authentication → Settings → SMTP).
- **MCP access note for future phases**: the Supabase MCP server is
  connected and working (`list_organizations`/`list_projects` confirmed
  it). Future phases can use it the same way this verification pass
  did — inspect schema with `list_tables`, apply new migrations with
  `apply_migration`, and always run `get_advisors` (security +
  performance) right after any schema change, the same discipline that
  caught three real gaps this pass.
- Design tokens are unchanged since Phase 1 (see "Theme decisions") —
  keep reusing them, including `bg-positive`/`text-positive`/
  `bg-negative`/`text-negative` for every _signed_ balance/amount
  display (money that's "owed" vs. "owed to you", positive vs.
  negative). `SettlementsView.tsx` and `BreakdownModal.tsx` (Phase 8)
  both do this correctly — copy that pattern for Phase 9's charts,
  don't reinvent it. Phase 7's expense amounts are deliberately **not**
  colored this way — an expense's total is never signed (it's not
  anyone's balance), so `ExpenseList.tsx` renders it as plain neutral
  text, matching the original app. Phase 7 _did_ reuse
  `text-positive`/`text-negative` once, for the EXACT split's
  running-total hint (sum matches vs. doesn't) — a legitimate extension
  of the tokens' "amount validity" intent, not a balance display, but
  worth knowing about if `bg-positive`/`text-positive` usages need
  auditing later.
- **All 10 ROADMAP.md phases are now built, including Phase 10.**
  Spaces, members, categories, expenses/claims, settlements, and
  analytics all have full CRUD/reporting UI, wired to live mutation
  hooks (or, for analytics, live queries), plus PWA manifest/icons, a
  Playwright smoke test with an automated accessibility scan, and
  `DEPLOYMENT.md`. **The one thing that still hasn't happened**: a real
  human clicking through the deployed app signed in with real Supabase
  auth. Every phase since Phase 4 deferred this, and Phase 10 confirmed
  it genuinely can't be scripted reliably against this live project
  (email confirmation + a very low default email rate limit — see
  "Decisions made during Phase 10"). This is now a documented manual
  step in `DEPLOYMENT.md` ("do one real manual pass after every
  deploy") rather than an open task on some future phase — there is no
  Phase 11 in ROADMAP.md, so whoever deploys this next should be the
  one to actually do it.
- **No charting library was ever installed** — Phase 9's category/payer
  charts are hand-built single-hue bar charts (`BarChart.tsx`), per the
  `dataviz` skill's "compare magnitude" guidance (see "Decisions made
  during Phase 9"). If a future need ever calls for a genuinely
  different chart type (a real time-series line, a pie/donut, anything
  needing true multi-hue categorical identity), that would be new
  groundwork, not an extension of what's here.
- **Soft-delete is now the pattern for any entity with history that must
  survive its removal** (see "Decisions made during Phase 5/6") — members
  and categories both use it now. Nothing else needs it yet.
- **A snapshot of a live-query object held in local/component state will
  go stale the moment that query refetches — derive it fresh from the
  query result on every render instead, keying local state by the
  entity's id, not the object itself.** Caught and fixed in `AppShell.tsx`
  in Phase 7 (`editingExpenseId`/`claimingExpenseId`) and reused as
  standard practice in Phase 8 (`settlementTarget`/`breakdownMemberId`) —
  see "Decisions made during Phase 7." Apply the same rule to any future
  phase that opens a modal/sheet targeting one row of live query data.
- **Prefer a `key`-based remount or a render-time derived value over an
  effect that calls a `useState` setter to "sync" state** — two
  `react-hooks/set-state-in-effect` lint errors surfaced in Phase 7's
  `ClaimModal.tsx` and were fixed this way; Phase 8's `SettlementModal`/
  `BreakdownModal` used the same pattern from the start and triggered no
  new lint findings. Reach for `key={...}` first in future phases
  before reaching for an effect.
- **When rendering several sibling modals that each fall back to a
  literal placeholder key (like `'none'`) while closed, prefix each
  one's key so their fallback values can't collide** — a real React
  duplicate-key warning surfaced in Phase 8 the moment a second such
  modal (`BreakdownModal`) was added alongside Phase 7's `ClaimModal`
  in `AppShell.tsx`, both defaulting to the bare string `'none'`. Fixed
  by prefixing every modal's key (`claim-`, `settlement-`, `breakdown-`).
  Any future phase adding another target-keyed modal to `AppShell.tsx`
  should prefix its key the same way from the start.
- **`skipHover: true` on `userEvent.setup()`** is the fix if a future
  phase's test can't get a Radix menu/dropdown trigger to open via a
  plain `user.click()`. **Separately**, if a future phase needs to open
  the _same_ dropdown/menu trigger in more than one test, each such test
  needs its own file — a second real open of the same trigger within one
  test file fails regardless of `skipHover` or what ran before it (see
  "Decisions made during Phase 6" for the isolated repro). Both are
  Radix/userEvent-under-jsdom quirks, not app bugs.
- **`useLedger`/`useSpaces`/the five query hooks are the stable
  foundation** every remaining phase builds on. Mutations (create/
  rename/delete for spaces, members, categories, expenses, claims,
  settlements) don't exist yet as hooks — each feature phase should add
  its own `use*Mutations.ts` file (e.g. `features/spaces/
useSpaceMutations.ts` in Phase 5) calling the existing repository
  functions and invalidating the relevant `queryKeys` entry, following
  exactly the pattern already established in `useSpaces.ts`'s bootstrap
  mutation.
- **`CardTitle` now renders `<h3>`** (see Phase 4 decisions) — every
  future `Card` usage gets correct heading semantics for free. No
  action needed, just don't be surprised by it in generated markup/snapshots.
- Bundle size is now ~922 KB JS / 272 KB gzipped, with all 9 feature
  phases plus the grouped-timeline feature now built — this is very
  likely close to its ceiling for the rest of the project (Phase 10 is
  polish/hardening, not new features). Now is a reasonable time to
  actually act on the long-deferred code-splitting suggestion rather
  than deferring it again, though still not a hard requirement.
- Domain layer (Phase 2's original modules) remains completely
  untouched and has zero knowledge of Supabase/auth/schema, as intended
  — Phase 4's fix to `listAllExpenses`/`listAllSettlements` was
  entirely in the data layer. `computeSettlements`/`buildBreakdown`/
  `sumBreakdown` were all written in Phase 2 but sat unused by any UI
  until Phase 8 wired them up, and Phase 9 added its own from-scratch
  `domain/analytics.ts`/`domain/csvExport.ts` alongside them — a
  reminder that "written and unit-tested" isn't the same as "exercised
  by the app," worth keeping in mind if Phase 10's browser pass finds
  behavior that looks unexercised.
- **Not yet manually verified in a real browser against the live
  project, for any phase from 4 through 9** (see each phase's own
  verification section above) — this is the single biggest thing Phase
  10 should do first, not defer again. Nine phases of test-suite-only
  confidence is a lot of surface area that's never been clicked through
  end to end against real Postgres + real Supabase Auth.
