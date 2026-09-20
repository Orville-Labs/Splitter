# domain

Pure business logic: no DOM, no network, no Supabase imports. Every
function here takes plain data in and returns plain data out.

- `money.ts` — rounding and ₹ formatting.
- `dateRange.ts` — range presets, local-calendar dates.
- `balances.ts` — the rule engine: split math, balances, who-pays-whom.
  Operates on member/category **ids**, never display names — see the
  file's top comment and `PROJECT_STATE.md`'s Phase 2 notes for why.
- `breakdown.ts` — human-readable line items behind one member's balance.
  Needs display names for its text, so it takes a `NameLookup` argument
  (plain data, not a network call) rather than reaching out to fetch
  names itself.

Consumed directly by feature components/hooks starting Phase 7 — this
layer has no dependency on Phase 3's Supabase work and nothing here will
change shape once the data layer exists; the data layer's job is to shape
DB rows into the `Ledger`/`Expense`/`Settlement` types defined in
`balances.ts`, however the schema ends up storing them.
