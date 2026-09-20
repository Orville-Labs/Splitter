-- ============================================================================
-- Categories are tags on expenses (expense_categories, ON DELETE CASCADE),
-- not part of the financial math — unlike members, a real DELETE here
-- would not be blocked by Postgres even if the category has expense
-- history. But it would silently cascade-remove the join row, erasing
-- that category tag from every past expense's history and retroactively
-- changing category-based analytics for prior periods. Soft-deleting
-- instead (never a real DELETE from the app) keeps expense_categories
-- rows intact, so history and analytics stay accurate for whatever was
-- true when the expense was recorded.
--
-- Same partial-unique-index treatment as members
-- (20260919090000_members_soft_delete.sql), for the same reason: without
-- it, a removed category's name would stay permanently reserved.
-- ============================================================================

alter table public.categories add column is_active boolean not null default true;

alter table public.categories drop constraint categories_space_id_name_key;
create unique index categories_space_id_name_active_key
  on public.categories (space_id, name)
  where is_active;
