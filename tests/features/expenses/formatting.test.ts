import { describe, expect, it } from 'vitest'

import type { Claim, Expense } from '@/domain/balances'
import { SplitTypes } from '@/domain/balances'
import { claimedTotal, initials, unclaimed } from '@/features/expenses/formatting'

describe('initials', () => {
  it('takes the first letter of each word, up to two', () => {
    expect(initials('Kavin Raj')).toBe('KR')
  })

  it('handles a single-word name', () => {
    expect(initials('Kavin')).toBe('K')
  })

  it('handles extra whitespace', () => {
    expect(initials('  Kavin   Raj  ')).toBe('KR')
  })
})

const claims: Claim[] = [
  { id: 'c1', member: 'kavin', amount: 100, qty: null, date: '2026-09-01' },
  { id: 'c2', member: 'mohan', amount: 50.5, qty: null, date: '2026-09-02' },
]

describe('claimedTotal', () => {
  it('sums every claim, rounded', () => {
    expect(claimedTotal(claims)).toBe(150.5)
  })

  it('is zero with no claims', () => {
    expect(claimedTotal([])).toBe(0)
  })
})

describe('unclaimed', () => {
  const expense: Expense = {
    id: 'e1',
    amount: 200,
    payer: 'mohan',
    categoryIds: [],
    splitType: SplitTypes.CLAIM,
    participants: [],
    splitData: {},
    date: '2026-09-01',
    note: '',
    unitPrice: 7,
    claims,
  }

  it('is the amount minus what has been claimed so far', () => {
    expect(unclaimed(expense)).toBe(49.5)
  })

  it('is the full amount when nothing has been claimed', () => {
    expect(unclaimed({ ...expense, claims: [] })).toBe(200)
  })
})
