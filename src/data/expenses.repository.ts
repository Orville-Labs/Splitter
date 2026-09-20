import { supabase } from '@/lib/supabaseClient'
import type { Expense, SplitType } from '@/domain/balances'
import type { ExpenseRelations } from './mappers'
import { toClaim, toExpense } from './mappers'
import { unwrap } from './supabaseError'

const TABLE = 'expenses'

/**
 * What the write path needs — a domain-shaped input, translated here into
 * the create_expense/update_expense RPC's arguments. See
 * supabase/migrations/20260918120200_expense_write_functions.sql for why
 * this is one atomic RPC rather than several client requests.
 */
export interface ExpenseInput {
  payerId: string
  amount: number
  splitType: SplitType
  unitPrice: number | null
  date: string
  note: string
  categoryIds: string[]
  /** EQUAL only. */
  participantIds: string[]
  /** EXACT only: member id -> entered amount. */
  shares: Record<string, number>
}

function sharesToRows(shares: Record<string, number>) {
  return Object.entries(shares).map(([member_id, amount]) => ({ member_id, amount }))
}

/**
 * `supabase gen types`'s codegen doesn't model function-argument
 * nullability (a known limitation — Postgres function parameters don't
 * carry a NOT NULL concept the generator can read the way table columns
 * do), so `create_expense`/`update_expense`'s generated Args types claim
 * `p_unit_price: number` and `p_participant_ids: string[]` are never
 * null, when the SQL itself accepts and expects null for a CLAIM/EXACT
 * expense. Both functions are genuinely nullable at the Postgres level —
 * this cast documents that gap rather than silently working around it.
 */
function nullable<T>(value: T | null): T {
  return value as T
}

/**
 * Every expense across every space the user owns, fully assembled
 * (categories, participants/shares, claims) and grouped by `space_id` —
 * mirrors the original app's `store.js`, which grouped raw rows by space
 * as it loaded them rather than carrying a space id on the mapped
 * domain object itself. This is deliberate: `Expense` (domain/balances.ts)
 * has no `spaceId` field — the domain layer doesn't know "spaces" exist —
 * so a flat `Expense[]` would give `useLedger` no way to tell which space
 * each one belongs to. Grouping here, once, is the fix.
 */
export async function listAllExpenses(): Promise<Record<string, Expense[]>> {
  // Five independent reads, issued concurrently — note the promises are
  // NOT awaited individually before being handed to Promise.all; doing
  // that would serialize them one at a time and defeat the point.
  const [
    expensesResult,
    categoryLinksResult,
    participantLinksResult,
    shareLinksResult,
    claimRowsResult,
  ] = await Promise.all([
    supabase.from(TABLE).select('*').order('created_at', { ascending: false }),
    supabase.from('expense_categories').select('expense_id, category_id'),
    supabase.from('expense_participants').select('expense_id, member_id'),
    supabase.from('expense_shares').select('expense_id, member_id, amount'),
    // Raw select, not claims.repository.ts's listAllClaims() — that
    // returns the domain Claim shape, which has no expense_id to group
    // by. This needs the raw row.
    supabase.from('claims').select('*'),
  ])

  const expenseRows = unwrap('Load expenses', expensesResult)
  const categoryLinks = unwrap('Load expense categories', categoryLinksResult)
  const participantLinks = unwrap('Load expense participants', participantLinksResult)
  const shareLinks = unwrap('Load expense shares', shareLinksResult)
  const claimRows = unwrap('Load claims', claimRowsResult)

  const relationsByExpense = new Map<string, ExpenseRelations>()
  const ensure = (expenseId: string): ExpenseRelations => {
    let relations = relationsByExpense.get(expenseId)
    if (!relations) {
      relations = { categoryIds: [], participantIds: [], shares: {}, claims: [] }
      relationsByExpense.set(expenseId, relations)
    }
    return relations
  }

  for (const link of categoryLinks) ensure(link.expense_id).categoryIds.push(link.category_id)
  for (const link of participantLinks) ensure(link.expense_id).participantIds.push(link.member_id)
  for (const share of shareLinks)
    ensure(share.expense_id).shares[share.member_id] = Number(share.amount)
  for (const row of claimRows) ensure(row.expense_id).claims.push(toClaim(row))

  const grouped: Record<string, Expense[]> = {}
  for (const row of expenseRows) {
    const expense = toExpense(row, ensure(row.id))
    ;(grouped[row.space_id] ??= []).push(expense)
  }
  return grouped
}

export async function createExpense(spaceId: string, input: ExpenseInput): Promise<string> {
  return unwrap(
    'Add expense',
    await supabase.rpc('create_expense', {
      p_space_id: spaceId,
      p_payer_id: input.payerId,
      p_amount: input.amount,
      p_split_type: input.splitType,
      p_unit_price: nullable(input.unitPrice),
      p_expense_date: input.date,
      p_note: input.note,
      p_category_ids: input.categoryIds,
      p_participant_ids: nullable(input.splitType === 'EQUAL' ? input.participantIds : null),
      p_shares: input.splitType === 'EXACT' ? sharesToRows(input.shares) : null,
    }),
  )
}

/** An edit never touches contributions already logged — update_expense doesn't write to claims. */
export async function updateExpense(expenseId: string, input: ExpenseInput): Promise<void> {
  unwrap(
    'Update expense',
    await supabase.rpc('update_expense', {
      p_expense_id: expenseId,
      p_payer_id: input.payerId,
      p_amount: input.amount,
      p_split_type: input.splitType,
      p_unit_price: nullable(input.unitPrice),
      p_expense_date: input.date,
      p_note: input.note,
      p_category_ids: input.categoryIds,
      p_participant_ids: nullable(input.splitType === 'EQUAL' ? input.participantIds : null),
      p_shares: input.splitType === 'EXACT' ? sharesToRows(input.shares) : null,
    }),
  )
}

/** Claims, categories, participants and shares all cascade via their FKs. */
export async function deleteExpense(id: string): Promise<void> {
  unwrap('Delete expense', await supabase.from(TABLE).delete().eq('id', id))
}
