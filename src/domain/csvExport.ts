import type { Expense } from './balances'
import { SplitTypes } from './balances'
import type { NameLookup } from './breakdown'

/**
 * CSV export of a space's expenses — ported from the original app's
 * csvExport.js. Building the string is pure and unit-tested here; the
 * actual browser download (Blob, object URL, anchor click) is a DOM
 * side effect that belongs in the UI layer, not this module.
 */
const CSV_HEADERS = ['Date', 'Payer', 'Amount', 'Split Type', 'Categories', 'Participants', 'Note']

export function buildExpensesCsv(expenses: readonly Expense[], names: NameLookup): string {
  const rows = [CSV_HEADERS, ...expenses.map((expense) => toCsvRow(expense, names))]
  return rows.map((row) => row.map(quoteCsvField).join(',')).join('\n')
}

function toCsvRow(expense: Expense, names: NameLookup): string[] {
  // For a claim, the people involved are whoever actually claimed a share.
  const participantIds =
    expense.splitType === SplitTypes.CLAIM
      ? [...new Set(expense.claims.map((claim) => claim.member))]
      : expense.participants

  return [
    expense.date,
    names.members[expense.payer] ?? expense.payer,
    String(expense.amount),
    expense.splitType,
    expense.categoryIds.map((id) => names.categories[id] ?? id).join('; '),
    participantIds.map((id) => names.members[id] ?? id).join('; '),
    expense.note,
  ]
}

/** RFC 4180: wrap in quotes, double any embedded quote. */
function quoteCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/** A filesystem-safe slug for the downloaded file's name. */
export function slugify(name: string): string {
  return (name || 'expenses').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '')
}
