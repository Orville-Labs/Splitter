import { supabase } from '@/lib/supabaseClient'
import { unwrap } from './supabaseError'

const TABLE = 'categories'

export interface CategoryRow {
  id: string
  spaceId: string
  name: string
  position: number
  isActive: boolean
}

function toCategory(row: {
  id: string
  space_id: string
  name: string
  position: number
  is_active: boolean
}): CategoryRow {
  return {
    id: row.id,
    spaceId: row.space_id,
    name: row.name,
    position: row.position,
    isActive: row.is_active,
  }
}

/**
 * Every category across every space the user owns — active AND inactive
 * (removed) — for grouping by space_id on load. Inactive categories must
 * stay in this list: `useLedger`'s NameLookup needs their name to label
 * old expenses that still reference them via expense_categories.
 * Filtering to only the *active* set (for the manage list and the
 * expense-form picker) is `useLedger`'s job, not this repository's.
 */
export async function listAllCategories(): Promise<CategoryRow[]> {
  const rows = unwrap(
    'Load categories',
    await supabase
      .from(TABLE)
      .select('id, space_id, name, position, is_active')
      .order('position')
      .order('id'),
  )
  return rows.map(toCategory)
}

export async function addCategory(
  spaceId: string,
  name: string,
  position: number,
): Promise<CategoryRow> {
  const row = unwrap(
    'Add category',
    await supabase.from(TABLE).insert({ space_id: spaceId, name, position }).select('*').single(),
  )
  return toCategory(row)
}

/** Bulk insert, used when seeding a brand-new space's defaults. */
export async function addCategories(spaceId: string, names: readonly string[]): Promise<void> {
  unwrap(
    'Seed categories',
    await supabase
      .from(TABLE)
      .insert(names.map((name, index) => ({ space_id: spaceId, name, position: index }))),
  )
}

/**
 * A soft delete — `is_active = false`, never a real DELETE. Unlike
 * members, expense_categories.category_id cascades on delete rather
 * than restricting it, so a real DELETE here wouldn't be blocked by
 * Postgres even with expense history — it would just silently erase the
 * category tag from every past expense that used it, retroactively
 * changing category-based analytics for prior periods. Soft-deleting
 * keeps those join rows intact. See
 * supabase/migrations/20260919090100_categories_soft_delete.sql.
 */
export async function removeCategory(id: string): Promise<void> {
  unwrap('Remove category', await supabase.from(TABLE).update({ is_active: false }).eq('id', id))
}

/** A plain rename — see members.repository.ts's renameMember for why no RPC is needed. */
export async function renameCategory(id: string, name: string): Promise<void> {
  unwrap('Rename category', await supabase.from(TABLE).update({ name }).eq('id', id))
}

/**
 * Writes the whole ordering in one round trip, keeping `position`
 * contiguous — a partial `{id, position}` upsert can't be used here
 * either, for the same reason as the original app (`name` is `NOT NULL`
 * with no default, so PostgREST would reject a partial-row upsert).
 */
export async function saveCategoryOrder(
  spaceId: string,
  orderedIds: readonly string[],
): Promise<void> {
  unwrap(
    'Reorder categories',
    await supabase.rpc('set_category_order', {
      p_space_id: spaceId,
      p_category_ids: [...orderedIds],
    }),
  )
}
