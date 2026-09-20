import { describe, expect, it } from 'vitest'

import type { Expense } from '@/domain/balances'
import { SplitTypes } from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'
import { buildExpensesCsv, slugify } from '@/domain/csvExport'

const names: NameLookup = {
  members: { m1: 'Kavin', m2: 'Mohan' },
  categories: { c1: 'Petrol' },
}

describe('buildExpensesCsv', () => {
  it('writes the header row even with no expenses', () => {
    expect(buildExpensesCsv([], names)).toBe(
      '"Date","Payer","Amount","Split Type","Categories","Participants","Note"',
    )
  })

  it('resolves ids to display names and joins multi-valued fields with "; "', () => {
    const expense: Expense = {
      id: 'e1',
      amount: 900,
      payer: 'm1',
      categoryIds: ['c1'],
      splitType: SplitTypes.EQUAL,
      participants: ['m1', 'm2'],
      splitData: {},
      date: '2026-09-01',
      note: 'Fuel',
      unitPrice: null,
      claims: [],
    }
    const csv = buildExpensesCsv([expense], names)
    const [, row] = csv.split('\n')
    expect(row).toBe('"2026-09-01","Kavin","900","EQUAL","Petrol","Kavin; Mohan","Fuel"')
  })

  it('uses the unique set of claimants as participants for a CLAIM expense', () => {
    const expense: Expense = {
      id: 'e1',
      amount: 700,
      payer: 'm2',
      categoryIds: [],
      splitType: SplitTypes.CLAIM,
      participants: [],
      splitData: {},
      date: '2026-09-02',
      note: '',
      unitPrice: 7,
      claims: [
        { id: 'c1', member: 'm1', amount: 210, qty: 30, date: '2026-09-02' },
        { id: 'c2', member: 'm1', amount: 70, qty: 10, date: '2026-09-02' },
      ],
    }
    const csv = buildExpensesCsv([expense], names)
    const [, row] = csv.split('\n')
    expect(row).toBe('"2026-09-02","Mohan","700","CLAIM","","Kavin",""')
  })

  it('doubles embedded quotes per RFC 4180', () => {
    const expense: Expense = {
      id: 'e1',
      amount: 10,
      payer: 'm1',
      categoryIds: [],
      splitType: SplitTypes.EQUAL,
      participants: ['m1'],
      splitData: {},
      date: '2026-09-01',
      note: 'Say "hi"',
      unitPrice: null,
      claims: [],
    }
    const csv = buildExpensesCsv([expense], names)
    expect(csv).toContain('"Say ""hi"""')
  })
})

describe('slugify', () => {
  it('replaces non-word characters with hyphens', () => {
    expect(slugify('Goa Trip!')).toBe('Goa-Trip')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  My Group  ')).toBe('My-Group')
  })

  it('falls back to "expenses" for a blank name', () => {
    expect(slugify('')).toBe('expenses')
  })
})
