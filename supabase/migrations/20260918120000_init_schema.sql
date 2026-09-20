-- ============================================================================
-- Spliter (rebuild) — initial schema.
--
-- Redesigned from the original app: members and categories are real rows
-- with UUID ids, referenced by id everywhere (expenses, claims,
-- settlements). The original kept the display name itself as the identity,
-- which meant a rename required an atomic multi-table RPC. With ids, a
-- rename is a plain `update members set name = $1 where id = $2` — no RPC.
--
-- This is a brand-new Supabase project, not a migration of the original
-- app's data. See ../../ROADMAP.md's "Redesigned data model" for the full
-- rationale and PROJECT_STATE.md for decisions made while writing this file.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------- profiles ----------
-- auth.users holds credentials; this mirrors the bits the app needs to
-- display, via a trigger below. Never queried directly against auth.users
-- from the client.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- ---------- spaces ----------
-- v1 is single-owner per space — no multi-user collaboration on one space
-- yet (a `space_collaborators` join table is the natural future extension,
-- deliberately out of scope here).
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index spaces_owner_idx on public.spaces (owner_id);

-- ---------- members ----------
-- A "member" is a participant in a space's ledger, not necessarily
-- someone with a login of their own.
create table public.members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 18),
  created_at timestamptz not null default now(),
  unique (space_id, name)
);

create index members_space_idx on public.members (space_id);

-- ---------- categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 18),
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (space_id, name)
);

create index categories_space_idx on public.categories (space_id, position);

-- ---------- expenses ----------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  payer_id uuid not null references public.members (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  split_type text not null check (split_type in ('EQUAL', 'EXACT', 'CLAIM')),
  unit_price numeric(12, 2) check (unit_price is null or unit_price > 0),
  expense_date date not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index expenses_space_idx on public.expenses (space_id);
create index expenses_payer_idx on public.expenses (payer_id);

-- ---------- expense <-> category (replaces expenses.categories[] text array) ----------
create table public.expense_categories (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (expense_id, category_id)
);

create index expense_categories_category_idx on public.expense_categories (category_id);

-- ---------- EQUAL split participants (no amount — see ROADMAP.md) ----------
create table public.expense_participants (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete restrict,
  primary key (expense_id, member_id)
);

create index expense_participants_member_idx on public.expense_participants (member_id);

-- ---------- EXACT split amounts (replaces expenses.split_data jsonb) ----------
create table public.expense_shares (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  primary key (expense_id, member_id)
);

create index expense_shares_member_idx on public.expense_shares (member_id);

-- ---------- claims (CLAIM split type only) ----------
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  qty numeric(12, 2),
  claim_date date not null,
  created_at timestamptz not null default now()
);

create index claims_expense_idx on public.claims (expense_id);
create index claims_member_idx on public.claims (member_id);

-- ---------- settlements ----------
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  from_member_id uuid not null references public.members (id) on delete restrict,
  to_member_id uuid not null references public.members (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  settlement_date date not null,
  created_at timestamptz not null default now(),
  check (from_member_id <> to_member_id)
);

create index settlements_space_idx on public.settlements (space_id);

-- ---------- profile bootstrap ----------
-- Mirrors the auth.users row the app actually needs into public.profiles,
-- so the client never has to (and generally cannot) query auth.users
-- directly. Standard Supabase pattern.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================================
-- Deliberate v1 simplifications (not enforced at the DB level):
--   - Nothing here checks that expense_participants/expense_shares/claims
--     rows actually match the expense's split_type (e.g. an EQUAL expense
--     shouldn't have expense_shares rows). The repository layer (Phase 3's
--     data/ modules) is responsible for writing the right rows for the
--     right split type. The original app had the same gap.
--   - No multi-user collaboration on a single space (see spaces' comment).
-- ============================================================================
