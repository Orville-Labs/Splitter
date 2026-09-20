import { formatCurrency } from '@/domain/money'

/** The "split equally across N members" helper line — ported from splitEditor.js's describeEqualSplit. */
export function equalSplitHint(selectedCount: number, memberCount: number, amount: number): string {
  if (selectedCount === 0) return 'Select at least one person to split with.'
  return selectedCount === memberCount
    ? `Split equally across all ${selectedCount} members.`
    : `Split equally across ${selectedCount} selected member${selectedCount > 1 ? 's' : ''} — ${formatCurrency(amount / selectedCount)} each.`
}

/** The running-total line under the EXACT split rows — ported from splitEditor.js's validateExactSplit. */
export function exactSplitHint(sum: number, total: number): string {
  return `Total: ${formatCurrency(sum)} of ${formatCurrency(total)}`
}
