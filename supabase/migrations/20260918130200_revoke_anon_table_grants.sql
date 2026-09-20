-- ============================================================================
-- Close a real gap found during live verification: Supabase provisions new
-- projects with full table-level privileges (SELECT/INSERT/UPDATE/DELETE/
-- TRUNCATE/REFERENCES/TRIGGER) granted to BOTH anon and authenticated by
-- default — not just authenticated, as the original migration's comment
-- ("anon gets nothing") assumed. RLS was correctly blocking all actual data
-- access for anon (verified empirically: anon got an empty result, not
-- real rows), but that left RLS as the *only* thing standing between anon
-- and full CRUD on every table — a real defense-in-depth gap: if RLS were
-- ever accidentally disabled on a table, anon would have unrestricted
-- access to it instantly. This makes the stated design intent actually
-- true at the grant level, not just at the policy level.
-- ============================================================================

revoke all on
  public.profiles,
  public.spaces,
  public.members,
  public.categories,
  public.expenses,
  public.expense_categories,
  public.expense_participants,
  public.expense_shares,
  public.claims,
  public.settlements
  from anon;
