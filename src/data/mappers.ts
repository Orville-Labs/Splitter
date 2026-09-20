/**
 * Translation between database rows (snake_case, string ids) and the
 * camelCase domain shapes defined in `src/domain/balances.ts`. Keeping
 * this in one place means a column rename touches exactly one file.
 */
import type { Claim, Expense, Settlement, SplitType } from '@/domain/balances'
import type { Database } from './database.types'

type ExpenseRow = Database['public']['Tables']['expenses']['Row']
type ClaimRow = Database['public']['Tables']['claims']['Row']
type SettlementRow = Database['public']['Tables']['settlements']['Row']

export function toClaim(row: ClaimRow): Claim {
  return {
    id: row.id,
    member: row.member_id,
    amount: Number(row.amount),
    qty: row.qty != null ? Number(row.qty) : null,
    date: row.claim_date,
  }
}

export function toSettlement(row: SettlementRow): Settlement {
  return {
    id: row.id,
    from: row.from_member_id,
    to: row.to_member_id,
    amount: Number(row.amount),
    date: row.settlement_date,
  }
}

/**
 * The rows needed to assemble one domain Expense, read separately (one
 * repository call per table, joined client-side) rather than via
 * PostgREST's embedded-select syntax — this mirrors the original app's
 * "load everything, group client-side" approach in its old store.js, and
 * keeps each query trivially fakeable in tests.
 */
export interface ExpenseRelations {
  categoryIds: string[]
  participantIds: string[]
  /** EXACT only: member id -> entered amount. */
  shares: Record<string, number>
  claims: Claim[]
}

export function toExpense(row: ExpenseRow, relations: ExpenseRelations): Expense {
  const splitType = row.split_type as SplitType
  return {
    id: row.id,
    amount: Number(row.amount),
    payer: row.payer_id,
    categoryIds: relations.categoryIds,
    splitType,
    participants: splitType === 'EQUAL' ? relations.participantIds : Object.keys(relations.shares),
    splitData: relations.shares,
    date: row.expense_date,
    note: row.note,
    unitPrice: row.unit_price != null ? Number(row.unit_price) : null,
    claims: relations.claims,
  }
}
