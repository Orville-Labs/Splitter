import { describe, expect, it } from 'vitest'

import { spendByCategory, spendByPayer } from '@/domain/analytics'
import type { Expense } from '@/domain/balances'
import { SplitTypes } from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'

const names: NameLookup = {
  members: { m1: 'Kavin', m2: 'Mohan' },
  categories: { c1: 'Petrol', c2: 'Egg' },
}

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: 'e1',
    amount: 100,
    payer: 'm1',
    categoryIds: [],
    splitType: SplitTypes.EQUAL,
    participants: ['m1', 'm2'],
    splitData: {},
    date: '2026-09-01',
    note: '',
    unitPrice: null,
    claims: [],
    ...overrides,
  }
}

describe('spendByCategory', () => {
  it('attributes an expense fully to its one category', () => {
    const totals = spendByCategory([expense({ categoryIds: ['c1'], amount: 100 })], names)
    expect(totals).toEqual([{ label: 'Petrol', amount: 100 }])
  })

  it('splits an expense evenly across multiple categories', () => {
    const totals = spendByCategory([expense({ categoryIds: ['c1', 'c2'], amount: 100 })], names)
    expect(totals).toEqual(
      expect.arrayContaining([
        { label: 'Petrol', amount: 50 },
        { label: 'Egg', amount: 50 },
      ]),
    )
  })

  it('buckets an uncategorized expense under "Uncategorized"', () => {
    const totals = spendByCategory([expense({ categoryIds: [], amount: 100 })], names)
    expect(totals).toEqual([{ label: 'Uncategorized', amount: 100 }])
  })

  it('sums across expenses sharing a category and sorts descending', () => {
    const totals = spendByCategory(
      [
        expense({ id: 'e1', categoryIds: ['c1'], amount: 30 }),
        expense({ id: 'e2', categoryIds: ['c2'], amount: 90 }),
        expense({ id: 'e3', categoryIds: ['c1'], amount: 40 }),
      ],
      names,
    )
    expect(totals).toEqual([
      { label: 'Egg', amount: 90 },
      { label: 'Petrol', amount: 70 },
    ])
  })

  it('is empty for no expenses', () => {
    expect(spendByCategory([], names)).toEqual([])
  })

  it('falls back to the raw id when a category has no name (e.g. deleted)', () => {
    const totals = spendByCategory([expense({ categoryIds: ['unknown-id'], amount: 20 })], names)
    expect(totals).toEqual([{ label: 'unknown-id', amount: 20 }])
  })
})

describe('spendByPayer', () => {
  it('seeds every given member at zero, even if they never paid', () => {
    const totals = spendByPayer([], ['m1', 'm2'], names)
    expect(totals).toEqual(
      expect.arrayContaining([
        { label: 'Kavin', amount: 0 },
        { label: 'Mohan', amount: 0 },
      ]),
    )
  })

  it('sums what each payer actually paid', () => {
    const totals = spendByPayer(
      [expense({ payer: 'm1', amount: 100 }), expense({ payer: 'm2', amount: 40 })],
      ['m1', 'm2'],
      names,
    )
    expect(totals).toEqual([
      { label: 'Kavin', amount: 100 },
      { label: 'Mohan', amount: 40 },
    ])
  })

  it('sorts descending by amount', () => {
    const totals = spendByPayer(
      [expense({ payer: 'm2', amount: 500 }), expense({ payer: 'm1', amount: 10 })],
      ['m1', 'm2'],
      names,
    )
    expect(totals.map((total) => total.label)).toEqual(['Mohan', 'Kavin'])
  })
})
