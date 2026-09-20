import { describe, expect, it } from 'vitest'

import { equalSplitHint, exactSplitHint } from '@/features/expenses/splitHints'

describe('equalSplitHint', () => {
  it('prompts for a selection when nobody is picked', () => {
    expect(equalSplitHint(0, 3, 900)).toBe('Select at least one person to split with.')
  })

  it('says "all" when everyone is selected', () => {
    expect(equalSplitHint(3, 3, 900)).toBe('Split equally across all 3 members.')
  })

  it('shows the per-person share when a subset is selected', () => {
    expect(equalSplitHint(2, 3, 900)).toBe(
      'Split equally across 2 selected members — ₹450.00 each.',
    )
  })

  it('keeps "member" singular for exactly one selected', () => {
    expect(equalSplitHint(1, 3, 900)).toBe('Split equally across 1 selected member — ₹900.00 each.')
  })
})

describe('exactSplitHint', () => {
  it('formats the running total against the target', () => {
    expect(exactSplitHint(60, 100)).toBe('Total: ₹60.00 of ₹100.00')
  })
})
