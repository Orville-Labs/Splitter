-- ============================================================================
-- Row Level Security + helper functions.
--
-- Unlike the original app (anon key, permissive RLS, everyone reads/writes
-- everything), this rebuild requires a signed-in user, and every row is
-- reachable only by the space's owner. GRANT decides whether a role may
-- touch a table at all; RLS decides which rows within it. Both are needed —
-- see the comment on the original app's own grants-fixup migration, which
-- explains this same distinction the hard way.
-- ============================================================================

-- ---------- helper: is the caller the owner of this space? ----------
-- security definer so it can be called from other tables' policies without
-- those policies needing their own path back to spaces.owner_id. Still safe:
-- it only ever answers "does auth.uid() own this space", nothing broader.
create or replace function public.is_space_owner(p_space_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.spaces s
    where s.id = p_space_id and s.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_space_owner(uuid) from public;
grant execute on function public.is_space_owner(uuid) to authenticated;

-- ---------- enable RLS everywhere ----------
alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.members enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expense_participants enable row level security;
alter table public.expense_shares enable row level security;
alter table public.claims enable row level security;
alter table public.settlements enable row level security;

-- ---------- policies ----------
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid());

create policy spaces_owner_all on public.spaces
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy members_owner_all on public.members
  for all using (is_space_owner(space_id))
  with check (is_space_owner(space_id));

create policy categories_owner_all on public.categories
  for all using (is_space_owner(space_id))
  with check (is_space_owner(space_id));

create policy expenses_owner_all on public.expenses
  for all using (is_space_owner(space_id))
  with check (is_space_owner(space_id));

-- expense_categories / expense_participants / expense_shares / claims have
-- no space_id of their own — ownership is checked transitively through
-- their expense.
create policy expense_categories_owner_all on public.expense_categories
  for all using (
    exists (select 1 from public.expenses e where e.id = expense_id and is_space_owner(e.space_id))
  )
  with check (
    exists (select 1 from public.expenses e where e.id = expense_id and is_space_owner(e.space_id))
  );

create policy expense_participants_owner_all on public.expense_participants
  for all using (
    exists (select 1 from public.expenses e where e.id = expense_id and is_space_owner(e.space_id))
  )
  with check (
    exists (select 1 from public.expenses e where e.id = expense_id and is_space_owner(e.space_id))
  );

create policy expense_shares_owner_all on public.expense_shares
  for all using (
    exists (select 1 from public.expenses e where e.id = expense_id and is_space_owner(e.space_id))
  )
  with check (
    exists (select 1 from public.expenses e where e.id = expense_id and is_space_owner(e.space_id))
  );

create policy claims_owner_all on public.claims
  for all using (
    exists (select 1 from public.expenses e where e.id = expense_id and is_space_owner(e.space_id))
  )
  with check (
    exists (select 1 from public.expenses e where e.id = expense_id and is_space_owner(e.space_id))
  );

create policy settlements_owner_all on public.settlements
  for all using (is_space_owner(space_id))
  with check (is_space_owner(space_id));

-- ---------- grants ----------
-- `authenticated` may touch these tables at all (RLS above still gates rows);
-- `anon` gets nothing — there is no unauthenticated access in this rebuild.
grant select, insert, update, delete on
  public.spaces,
  public.members,
  public.categories,
  public.expenses,
  public.expense_categories,
  public.expense_participants,
  public.expense_shares,
  public.claims,
  public.settlements
  to authenticated;

grant select, update on public.profiles to authenticated;

-- ---------- atomic category reorder ----------
-- Same rationale as the original app's set_category_order: writing N
-- position updates as separate client round trips risks a partial write
-- if one fails mid-way. Keyed by category id now, not name — no rename
-- cascade concern here either way, since renames don't touch this function.
-- Deliberately NOT security definer: the categories_owner_all policy above
-- already governs this update correctly for the calling (invoker) role, and
-- there is no reason for this function to bypass RLS on its own table.
create or replace function public.set_category_order(p_space_id uuid, p_category_ids uuid[])
returns void
language sql
set search_path = public
as $$
  update public.categories c
     set position = arr.ord - 1
    from unnest(p_category_ids) with ordinality as arr (id, ord)
   where c.space_id = p_space_id and c.id = arr.id;
$$;

revoke all on function public.set_category_order(uuid, uuid []) from public;
grant execute on function public.set_category_order(uuid, uuid []) to authenticated;
