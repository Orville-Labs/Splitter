import { supabase } from '@/lib/supabaseClient'
import type { Claim } from '@/domain/balances'
import { toClaim } from './mappers'
import { unwrap } from './supabaseError'

const TABLE = 'claims'

/** Every claim across every space the user owns, grouped by expense_id client-side. */
export async function listAllClaims(): Promise<Claim[]> {
  const rows = unwrap('Load claims', await supabase.from(TABLE).select('*').order('created_at'))
  return rows.map(toClaim)
}

export async function createClaim(params: {
  expenseId: string
  memberId: string
  amount: number
  qty: number | null
  date: string
}): Promise<Claim> {
  const row = unwrap(
    'Save contribution',
    await supabase
      .from(TABLE)
      .insert({
        expense_id: params.expenseId,
        member_id: params.memberId,
        amount: params.amount,
        qty: params.qty,
        claim_date: params.date,
      })
      .select('*')
      .single(),
  )
  return toClaim(row)
}

export async function deleteClaim(id: string): Promise<void> {
  unwrap('Delete contribution', await supabase.from(TABLE).delete().eq('id', id))
}
