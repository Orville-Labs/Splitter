import { isWithinRange } from './dateRange'
import type { CategoryId, Expense, Ledger, MemberId } from './balances'
import { expenseShareMap } from './balances'
import { formatCurrency, round2 } from './money'

/**
 * `buildBreakdown` produces human-readable line items ("Paid ₹900 total ·
 * your share ₹300"), which needs display names — but the ledger only
 * carries ids (see balances.ts). Rather than have this pure module reach
 * out to fetch names itself (which would make it impure), the caller
 * passes a plain lookup: still just data in, data out, no I/O.
 */
export interface NameLookup {
  members: Record<MemberId, string>
  categories: Record<CategoryId, string>
}

function memberName(names: NameLookup, id: MemberId): string {
  return names.members[id] ?? id
}

export interface DateBounds {
  from?: string
  to?: string
}

export interface BreakdownRow {
  date: string
  title: string
  detail: string
  /** newest first; positive means the balance moved in the member's favour */
  amount: number
}

export function categoryLabel(expense: Expense, names: NameLookup): string {
  return expense.categoryIds?.length
    ? expense.categoryIds.map((id) => names.categories[id] ?? id).join(', ')
    : 'Uncategorized'
}

/**
 * The line items behind one member's balance: every expense that moved
 * their position, plus every settlement they were part of.
 *
 * Uses the same `expenseShareMap` as `computeBalances`, so over an
 * unbounded range these rows always sum exactly to that member's balance.
 */
export function buildBreakdown(
  ledger: Ledger,
  member: MemberId,
  names: NameLookup,
  range: DateBounds = {},
): BreakdownRow[] {
  const { from = '', to = '' } = range
  const rows: BreakdownRow[] = []

  for (const expense of ledger.expenses) {
    if (!isWithinRange(expense.date, from, to)) continue

    const { share } = expenseShareMap(expense)
    const paid = expense.payer === member ? expense.amount : 0
    const owed = share[member] || 0
    const impact = paid - owed
    if (Math.abs(impact) < 0.005) continue

    rows.push({
      date: expense.date,
      title: expense.note || categoryLabel(expense, names),
      detail: describeExpense(expense, paid, owed, names),
      amount: impact,
    })
  }

  for (const settlement of ledger.settlements) {
    if (!isWithinRange(settlement.date, from, to)) continue

    if (settlement.from === member) {
      rows.push({
        date: settlement.date,
        title: 'Settlement',
        detail: `You paid ${memberName(names, settlement.to)}`,
        amount: settlement.amount,
      })
    } else if (settlement.to === member) {
      rows.push({
        date: settlement.date,
        title: 'Settlement',
        detail: `Received from ${memberName(names, settlement.from)}`,
        amount: -settlement.amount,
      })
    }
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date))
}

/** Net movement across the rows — what the range changed for this member. */
export function sumBreakdown(rows: BreakdownRow[]): number {
  return round2(rows.reduce((total, row) => total + row.amount, 0))
}

export interface BreakdownDayGroup {
  date: string
  rows: BreakdownRow[]
}

/**
 * Buckets `buildBreakdown`'s rows into day groups for a grouped
 * timeline feed, one divider per calendar date. Relies on the rows
 * already being sorted by date (which `buildBreakdown` guarantees) so
 * that every row for one day is contiguous — this never re-sorts.
 */
export function groupBreakdownByDay(rows: readonly BreakdownRow[]): BreakdownDayGroup[] {
  const groups: BreakdownDayGroup[] = []

  for (const row of rows) {
    const currentGroup = groups[groups.length - 1]
    if (currentGroup && currentGroup.date === row.date) {
      currentGroup.rows.push(row)
    } else {
      groups.push({ date: row.date, rows: [row] })
    }
  }

  return groups
}

function describeExpense(expense: Expense, paid: number, owed: number, names: NameLookup): string {
  if (paid && owed) {
    return `Paid ${formatCurrency(expense.amount)} total · your share ${formatCurrency(owed)}`
  }
  if (paid) return `Paid ${formatCurrency(expense.amount)} total`
  return `${memberName(names, expense.payer)} paid · your share ${formatCurrency(owed)}`
}
