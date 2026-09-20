-- ============================================================================
-- Fixes for findings from get_advisors (security + performance), run right
-- after the initial three migrations landed. See PROJECT_STATE.md's Phase 3
-- "live project" notes for why these weren't caught before a real Postgres
-- existed to lint against.
-- ============================================================================

-- ---------- security: handle_new_user must never be callable via RPC ----------
-- It only needs to fire as an AFTER INSERT trigger on auth.users, which does
-- not require the invoking session to hold EXECUTE on the function. Supabase
-- projects grant EXECUTE on new public-schema functions to anon/authenticated
-- by default (a convenience for custom RPCs), which is wrong for a
-- trigger-only, security-definer function like this one.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------- security: is_space_owner must not be callable by anon ----------
-- authenticated still needs it — RLS policies on members/categories/expenses/
-- etc. call it as part of evaluating a signed-in user's own queries. anon has
-- no legitimate use for it (v1 has no unauthenticated access at all) and it
-- was reachable via /rest/v1/rpc/is_space_owner only because of the same
-- default per-schema grant described above.
revoke execute on function public.is_space_owner(uuid) from anon;

-- ---------- performance: missing covering indexes on settlements' new FKs ----------
create index if not exists settlements_from_member_idx on public.settlements (from_member_id);
create index if not exists settlements_to_member_idx on public.settlements (to_member_id);

-- ---------- performance: wrap auth.uid() so it's evaluated once per query, ----------
-- ---------- not once per row (RLS initplan optimization) ----------
alter policy profiles_select_self on public.profiles
  using (id = (select auth.uid()));
alter policy profiles_update_self on public.profiles
  using (id = (select auth.uid()));
alter policy spaces_owner_all on public.spaces
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
