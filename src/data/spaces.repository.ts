import { supabase } from '@/lib/supabaseClient'
import { unwrap } from './supabaseError'

const TABLE = 'spaces'

export interface Space {
  id: string
  ownerId: string
  name: string
  position: number
}

function toSpace(row: { id: string; owner_id: string; name: string; position: number }): Space {
  return { id: row.id, ownerId: row.owner_id, name: row.name, position: row.position }
}

/** Every space the signed-in user owns (RLS scopes this automatically). */
export async function listSpaces(): Promise<Space[]> {
  const rows = unwrap(
    'Load spaces',
    await supabase.from(TABLE).select('*').order('position').order('created_at'),
  )
  return rows.map(toSpace)
}

export async function createSpace(ownerId: string, name: string, position: number): Promise<Space> {
  const row = unwrap(
    'Create space',
    await supabase.from(TABLE).insert({ owner_id: ownerId, name, position }).select('*').single(),
  )
  return toSpace(row)
}

export async function renameSpace(id: string, name: string): Promise<void> {
  unwrap('Rename space', await supabase.from(TABLE).update({ name }).eq('id', id))
}

/** Cascades to members, categories, expenses (and their join tables) and settlements. */
export async function deleteSpace(id: string): Promise<void> {
  unwrap('Delete space', await supabase.from(TABLE).delete().eq('id', id))
}
