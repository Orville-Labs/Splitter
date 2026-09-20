import type { Expense, MemberId } from './balances'
import type { NameLookup } from './breakdown'
import { round2 } from './money'

/**
 * Spend aggregation for the Analytics tab — a different concern from
 * breakdown.ts's per-member ledger rows (this is whole-space reporting,
 * not one person's balance). Keyed and sorted by display label rather
 * than id: analytics is inherently a presentation concern, and every
 * caller needs the label anyway (there's no further lookup to do with
 * the id once a bar is drawn), unlike breakdown.ts's rows which stay
 * id-free for the same reason.
 */
export interface SpendTotal {
  label: string
  amount: number
}

const UNCATEGORIZED_LABEL = 'Uncategorized'

function toSortedTotals(totals: Record<string, number>): SpendTotal[] {
  return Object.entries(totals)
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)
}

/** An expense in N categories contributes 1/N of its amount to each — ported from the original app's spendByCategory. */
export function spendByCategory(expenses: readonly Expense[], names: NameLookup): SpendTotal[] {
  const totals: Record<string, number> = {}

  for (const expense of expenses) {
    const labels = expense.categoryIds.length
      ? expense.categoryIds.map((id) => names.categories[id] ?? id)
      : [UNCATEGORIZED_LABEL]
    const share = expense.amount / labels.length
    for (const label of labels) {
      totals[label] = round2((totals[label] ?? 0) + share)
    }
  }

  return toSortedTotals(totals)
}

/** Seeded with every given member at zero, so someone who hasn't paid for anything still gets a bar — ported from the original app's spendByPayer. */
export function spendByPayer(
  expenses: readonly Expense[],
  memberIds: readonly MemberId[],
  names: NameLookup,
): SpendTotal[] {
  const totals: Record<string, number> = Object.fromEntries(
    memberIds.map((id) => [names.members[id] ?? id, 0]),
  )

  for (const expense of expenses) {
    const label = names.members[expense.payer] ?? expense.payer
    totals[label] = round2((totals[label] ?? 0) + expense.amount)
  }

  return toSortedTotals(totals)
}
