import { supabase } from '@/lib/supabaseClient'
import type { Settlement } from '@/domain/balances'
import { toSettlement } from './mappers'
import { unwrap } from './supabaseError'

const TABLE = 'settlements'

/**
 * Grouped by `space_id`, for the same reason as
 * expenses.repository.ts's `listAllExpenses` — the domain `Settlement`
 * shape has no `spaceId` field, so a flat array would give `useLedger` no
 * way to tell which space each settlement belongs to.
 */
export async function listAllSettlements(): Promise<Record<string, Settlement[]>> {
  const rows = unwrap(
    'Load settlements',
    await supabase.from(TABLE).select('*').order('created_at', { ascending: false }),
  )
  const grouped: Record<string, Settlement[]> = {}
  for (const row of rows) {
    ;(grouped[row.space_id] ??= []).push(toSettlement(row))
  }
  return grouped
}

export async function createSettlement(
  spaceId: string,
  params: { from: string; to: string; amount: number; date: string },
): Promise<Settlement> {
  const row = unwrap(
    'Save settlement',
    await supabase
      .from(TABLE)
      .insert({
        space_id: spaceId,
        from_member_id: params.from,
        to_member_id: params.to,
        amount: params.amount,
        settlement_date: params.date,
      })
      .select('*')
      .single(),
  )
  return toSettlement(row)
}

export async function updateSettlement(
  id: string,
  params: { from: string; to: string; amount: number },
): Promise<Settlement> {
  const row = unwrap(
    'Update settlement',
    await supabase
      .from(TABLE)
      .update({ from_member_id: params.from, to_member_id: params.to, amount: params.amount })
      .eq('id', id)
      .select('*')
      .single(),
  )
  return toSettlement(row)
}

export async function deleteSettlement(id: string): Promise<void> {
  unwrap('Delete settlement', await supabase.from(TABLE).delete().eq('id', id))
}
