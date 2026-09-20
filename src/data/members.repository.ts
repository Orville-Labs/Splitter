import { supabase } from '@/lib/supabaseClient'
import { unwrap } from './supabaseError'

const TABLE = 'members'

export interface MemberRow {
  id: string
  spaceId: string
  name: string
  isActive: boolean
}

function toMember(row: {
  id: string
  space_id: string
  name: string
  is_active: boolean
}): MemberRow {
  return { id: row.id, spaceId: row.space_id, name: row.name, isActive: row.is_active }
}

/**
 * Every member across every space the user owns — active AND inactive
 * (removed) — for grouping by space_id on load. Inactive members must
 * stay in this list: `useLedger`'s NameLookup needs their name to label
 * old expenses/settlements that still reference them. Filtering to only
 * the *active* roster (for pickers, and for computeBalances's zero-
 * balance seed list) is `useLedger`'s job, not this repository's.
 */
export async function listAllMembers(): Promise<MemberRow[]> {
  const rows = unwrap(
    'Load members',
    await supabase.from(TABLE).select('id, space_id, name, is_active').order('created_at'),
  )
  return rows.map(toMember)
}

export async function addMember(spaceId: string, name: string): Promise<MemberRow> {
  const row = unwrap(
    'Add member',
    await supabase.from(TABLE).insert({ space_id: spaceId, name }).select('*').single(),
  )
  return toMember(row)
}

/**
 * A soft delete — `is_active = false`, never a real DELETE. Every
 * expense/claim/settlement references members.id with
 * `ON DELETE RESTRICT`; an actual delete would be blocked by Postgres
 * the moment a member has any history, which is the common case and
 * directly contradicts the product requirement ("remove from the group,
 * keep past expense history"). See
 * supabase/migrations/20260919090000_members_soft_delete.sql.
 */
export async function removeMember(id: string): Promise<void> {
  unwrap('Remove member', await supabase.from(TABLE).update({ is_active: false }).eq('id', id))
}

/**
 * A plain rename — the redesigned schema's whole point. The original app
 * needed an atomic `rename_member` RPC because the member's name string
 * *was* the identity, copied into five other tables. Here the id never
 * changes, so nothing else needs to be touched.
 */
export async function renameMember(id: string, name: string): Promise<void> {
  unwrap('Rename member', await supabase.from(TABLE).update({ name }).eq('id', id))
}
