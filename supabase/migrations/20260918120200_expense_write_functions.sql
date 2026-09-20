-- ============================================================================
-- Atomic expense writes.
--
-- The original app stored one expense as a single row (categories[] and
-- split_data were arrays/jsonb on that row), so one insert/update was
-- naturally atomic. This rebuild normalizes that into expenses +
-- expense_categories + (expense_participants | expense_shares), so a plain
-- multi-request client write could fail partway through and leave an
-- expense with the wrong categories or no participants. These two
-- functions do the whole write in one transaction — the same rationale as
-- the original's rename_member/set_category_order RPCs, applied to a new
-- problem this schema introduces.
--
-- security invoker (the default): RLS on expenses/expense_categories/
-- expense_participants/expense_shares still governs every statement inside,
-- exactly as if the caller had issued them directly.
-- ============================================================================

create or replace function public.create_expense(
  p_space_id uuid,
  p_payer_id uuid,
  p_amount numeric,
  p_split_type text,
  p_unit_price numeric,
  p_expense_date date,
  p_note text,
  p_category_ids uuid[],
  p_participant_ids uuid[],
  p_shares jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_expense_id uuid;
begin
  insert into public.expenses (space_id, payer_id, amount, split_type, unit_price, expense_date, note)
  values (p_space_id, p_payer_id, p_amount, p_split_type, p_unit_price, p_expense_date, coalesce(p_note, ''))
  returning id into v_expense_id;

  if p_category_ids is not null and array_length(p_category_ids, 1) > 0 then
    insert into public.expense_categories (expense_id, category_id)
    select v_expense_id, cid from unnest(p_category_ids) as cid;
  end if;

  if p_split_type = 'EQUAL' and p_participant_ids is not null then
    insert into public.expense_participants (expense_id, member_id)
    select v_expense_id, mid from unnest(p_participant_ids) as mid;
  end if;

  if p_split_type = 'EXACT' and p_shares is not null then
    insert into public.expense_shares (expense_id, member_id, amount)
    select v_expense_id, (x.member_id)::uuid, (x.amount)::numeric
      from jsonb_to_recordset(p_shares) as x (member_id text, amount numeric);
  end if;

  -- CLAIM: no rows in either table — claims are added separately, one at a
  -- time, via the claims table directly (mirrors the original app, where
  -- a CLAIM expense starts with zero contributions).

  return v_expense_id;
end;
$$;

revoke all on function public.create_expense(uuid, uuid, numeric, text, numeric, date, text, uuid[], uuid[], jsonb) from public;
grant execute on function public.create_expense(uuid, uuid, numeric, text, numeric, date, text, uuid[], uuid[], jsonb) to authenticated;

-- Replaces an expense's categories/participants/shares wholesale — same
-- "write the whole set" pattern as set_category_order, and deliberately
-- does not touch the claims table (an edit never mutates contributions
-- already logged, same invariant as the original app).
create or replace function public.update_expense(
  p_expense_id uuid,
  p_payer_id uuid,
  p_amount numeric,
  p_split_type text,
  p_unit_price numeric,
  p_expense_date date,
  p_note text,
  p_category_ids uuid[],
  p_participant_ids uuid[],
  p_shares jsonb
)
returns void
language plpgsql
set search_path = public
as $$
begin
  update public.expenses
     set payer_id = p_payer_id,
         amount = p_amount,
         split_type = p_split_type,
         unit_price = p_unit_price,
         expense_date = p_expense_date,
         note = coalesce(p_note, '')
   where id = p_expense_id;

  delete from public.expense_categories where expense_id = p_expense_id;
  delete from public.expense_participants where expense_id = p_expense_id;
  delete from public.expense_shares where expense_id = p_expense_id;

  if p_category_ids is not null and array_length(p_category_ids, 1) > 0 then
    insert into public.expense_categories (expense_id, category_id)
    select p_expense_id, cid from unnest(p_category_ids) as cid;
  end if;

  if p_split_type = 'EQUAL' and p_participant_ids is not null then
    insert into public.expense_participants (expense_id, member_id)
    select p_expense_id, mid from unnest(p_participant_ids) as mid;
  end if;

  if p_split_type = 'EXACT' and p_shares is not null then
    insert into public.expense_shares (expense_id, member_id, amount)
    select p_expense_id, (x.member_id)::uuid, (x.amount)::numeric
      from jsonb_to_recordset(p_shares) as x (member_id text, amount numeric);
  end if;
end;
$$;

revoke all on function public.update_expense(uuid, uuid, numeric, text, numeric, date, text, uuid[], uuid[], jsonb) from public;
grant execute on function public.update_expense(uuid, uuid, numeric, text, numeric, date, text, uuid[], uuid[], jsonb) to authenticated;
