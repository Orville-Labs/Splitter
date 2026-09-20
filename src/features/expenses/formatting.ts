import type { Claim, Expense } from '@/domain/balances'
import { round2 } from '@/domain/money'

/** "Kavin Raj" -> "KR" — ported from the original app's dom.js initials(). */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function claimedTotal(claims: readonly Claim[]): number {
  return round2(claims.reduce((sum, claim) => sum + claim.amount, 0))
}

export function unclaimed(expense: Expense): number {
  return round2(expense.amount - claimedTotal(expense.claims))
}
