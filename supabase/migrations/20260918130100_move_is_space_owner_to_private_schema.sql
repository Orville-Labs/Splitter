-- ============================================================================
-- Close the remaining advisor finding: is_space_owner was reachable via
-- /rest/v1/rpc/is_space_owner for any authenticated user (a "do I own space
-- X" boolean oracle). PostgREST only routes RPC calls for schemas it's
-- configured to expose (normally just `public`), so moving this RLS helper
-- into a fresh `private` schema removes it from that surface entirely.
--
-- This does NOT break RLS: policy evaluation checks the calling role's own
-- privileges regardless of schema "exposure" (that's a PostgREST-only
-- concept, not a Postgres one), so `authenticated` still needs — and gets —
-- USAGE on the schema and EXECUTE on the function.
-- ============================================================================

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_space_owner(p_space_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.spaces s
    where s.id = p_space_id and s.owner_id = (select auth.uid())
  );
$$;

revoke all on function private.is_space_owner(uuid) from public, anon;
grant execute on function private.is_space_owner(uuid) to authenticated;

alter policy members_owner_all on public.members
  using (private.is_space_owner(space_id))
  with check (private.is_space_owner(space_id));

alter policy categories_owner_all on public.categories
  using (private.is_space_owner(space_id))
  with check (private.is_space_owner(space_id));

alter policy expenses_owner_all on public.expenses
  using (private.is_space_owner(space_id))
  with check (private.is_space_owner(space_id));

alter policy expense_categories_owner_all on public.expense_categories
  using (exists (select 1 from public.expenses e where e.id = expense_id and private.is_space_owner(e.space_id)))
  with check (exists (select 1 from public.expenses e where e.id = expense_id and private.is_space_owner(e.space_id)));

alter policy expense_participants_owner_all on public.expense_participants
  using (exists (select 1 from public.expenses e where e.id = expense_id and private.is_space_owner(e.space_id)))
  with check (exists (select 1 from public.expenses e where e.id = expense_id and private.is_space_owner(e.space_id)));

alter policy expense_shares_owner_all on public.expense_shares
  using (exists (select 1 from public.expenses e where e.id = expense_id and private.is_space_owner(e.space_id)))
  with check (exists (select 1 from public.expenses e where e.id = expense_id and private.is_space_owner(e.space_id)));

alter policy claims_owner_all on public.claims
  using (exists (select 1 from public.expenses e where e.id = expense_id and private.is_space_owner(e.space_id)))
  with check (exists (select 1 from public.expenses e where e.id = expense_id and private.is_space_owner(e.space_id)));

alter policy settlements_owner_all on public.settlements
  using (private.is_space_owner(space_id))
  with check (private.is_space_owner(space_id));

-- The old public-schema copy is no longer referenced by any policy.
drop function if exists public.is_space_owner(uuid);
