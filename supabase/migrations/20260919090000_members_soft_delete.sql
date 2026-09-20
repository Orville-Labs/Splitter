-- ============================================================================
-- Members must support "remove from the group, keep past expense history"
-- (the original app's exact wording). With real foreign keys instead of
-- name-string references, expenses/expense_participants/expense_shares/
-- claims/settlements all reference members.id with ON DELETE RESTRICT —
-- a real DELETE would be blocked by Postgres the moment a member has any
-- history at all, which is the common case. Fixed with a soft-delete flag
-- instead of ever issuing a real DELETE on this table from the app.
--
-- The existing plain UNIQUE(space_id, name) also had to go: without
-- changing it, a removed member's name would stay permanently reserved
-- (the row still exists, just inactive), blocking anyone from ever
-- reusing that name in the space again. A partial unique index — unique
-- only among *active* rows — allows a name to be reused once its
-- previous holder is inactive, while still preventing two active members
-- from colliding.
-- ============================================================================

alter table public.members add column is_active boolean not null default true;

alter table public.members drop constraint members_space_id_name_key;
create unique index members_space_id_name_active_key
  on public.members (space_id, name)
  where is_active;
