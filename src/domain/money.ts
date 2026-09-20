/** Currency and number helpers. Pure — no DOM, no network. */

/** Rounds to 2 decimal places, correcting float drift (0.1 + 0.2 style). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Formats a number as Indian-locale rupees, e.g. -1234.5 -> "-₹1,234.50". */
export function formatCurrency(value: number): string {
  const rounded = round2(value)
  return (
    (rounded < 0 ? '-' : '') +
    '₹' +
    Math.abs(rounded).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

/** Amounts below this are treated as zero when settling up. */
export const SETTLED_EPSILON = 0.01

/** True when a balance is close enough to zero to call it settled. */
export function isSettled(value: number): boolean {
  return Math.abs(value) < SETTLED_EPSILON
}
