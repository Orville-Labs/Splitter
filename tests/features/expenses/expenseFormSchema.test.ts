import { describe, expect, it } from 'vitest'

import type { Expense } from '@/domain/balances'
import { SplitTypes } from '@/domain/balances'
import { today } from '@/domain/dateRange'
import {
  buildDefaultValues,
  expenseFormSchema,
  expenseToFormValues,
  pruneParticipants,
  toExpenseInput,
  type ExpenseFormValues,
} from '@/features/expenses/expenseFormSchema'

function baseValues(overrides: Partial<ExpenseFormValues> = {}): ExpenseFormValues {
  return {
    amount: '100',
    payerId: 'kavin',
    categoryIds: [],
    date: '2026-09-01',
    note: 'Fuel',
    splitType: SplitTypes.EQUAL,
    equalParticipantIds: ['kavin', 'mohan'],
    exactParticipantIds: [],
    exactAmounts: {},
    unitPrice: '',
    ...overrides,
  }
}

describe('pruneParticipants', () => {
  it('keeps the subset that still exists among the current members', () => {
    expect(pruneParticipants(['a', 'b'], ['a', 'b', 'c'])).toEqual(['a', 'b'])
  })

  it('falls back to every current member when nothing survives', () => {
    expect(pruneParticipants(['removed'], ['a', 'b'])).toEqual(['a', 'b'])
  })
})

describe('buildDefaultValues', () => {
  it('defaults to EQUAL, split across everyone, payer is the first member', () => {
    const values = buildDefaultValues(['kavin', 'mohan'])
    expect(values.splitType).toBe(SplitTypes.EQUAL)
    expect(values.payerId).toBe('kavin')
    expect(values.equalParticipantIds).toEqual(['kavin', 'mohan'])
    expect(values.exactParticipantIds).toEqual(['kavin', 'mohan'])
    expect(values.amount).toBe('')
    expect(values.date).toBe(today())
  })

  it('has no payer when the space has no members yet', () => {
    expect(buildDefaultValues([]).payerId).toBe('')
  })
})

describe('expenseToFormValues', () => {
  const equalExpense: Expense = {
    id: 'e1',
    amount: 900,
    payer: 'kavin',
    categoryIds: ['petrol'],
    splitType: SplitTypes.EQUAL,
    participants: ['kavin', 'mohan'],
    splitData: {},
    date: '2026-09-01',
    note: 'Fuel',
    unitPrice: null,
    claims: [],
  }

  it('prefills an EQUAL expense, pruning participants against current members', () => {
    const values = expenseToFormValues(equalExpense, ['kavin', 'mohan', 'kishore'])
    expect(values.amount).toBe('900')
    expect(values.payerId).toBe('kavin')
    expect(values.equalParticipantIds).toEqual(['kavin', 'mohan'])
  })

  it('falls back to every current member when a participant was removed', () => {
    const values = expenseToFormValues(equalExpense, ['kishore'])
    expect(values.equalParticipantIds).toEqual(['kishore'])
  })

  it('prefills an EXACT expense with raw string amounts', () => {
    const exactExpense: Expense = {
      ...equalExpense,
      splitType: SplitTypes.EXACT,
      participants: ['kavin', 'mohan'],
      splitData: { kavin: 600, mohan: 300 },
    }
    const values = expenseToFormValues(exactExpense, ['kavin', 'mohan'])
    expect(values.exactParticipantIds).toEqual(['kavin', 'mohan'])
    expect(values.exactAmounts).toEqual({ kavin: '600', mohan: '300' })
  })

  it('prefills a CLAIM expense with its unit price as a string, or blank when null', () => {
    const claimExpense: Expense = {
      ...equalExpense,
      splitType: SplitTypes.CLAIM,
      participants: [],
      unitPrice: 7,
      claims: [],
    }
    expect(expenseToFormValues(claimExpense, ['kavin']).unitPrice).toBe('7')
    expect(expenseToFormValues({ ...claimExpense, unitPrice: null }, ['kavin']).unitPrice).toBe('')
  })
})

describe('toExpenseInput', () => {
  it('builds an EQUAL input with participantIds and no shares', () => {
    const input = toExpenseInput(baseValues())
    expect(input).toMatchObject({
      payerId: 'kavin',
      amount: 100,
      splitType: SplitTypes.EQUAL,
      unitPrice: null,
      participantIds: ['kavin', 'mohan'],
      shares: {},
    })
  })

  it('builds an EXACT input with shares keyed by the selected participants', () => {
    const input = toExpenseInput(
      baseValues({
        splitType: SplitTypes.EXACT,
        exactParticipantIds: ['kavin', 'mohan'],
        exactAmounts: { kavin: '60', mohan: '40' },
      }),
    )
    expect(input.splitType).toBe(SplitTypes.EXACT)
    expect(input.shares).toEqual({ kavin: 60, mohan: 40 })
    expect(input.participantIds).toEqual([])
  })

  it('builds a CLAIM input with a null unit price when left blank or zero', () => {
    const blank = toExpenseInput(baseValues({ splitType: SplitTypes.CLAIM, unitPrice: '' }))
    expect(blank.unitPrice).toBeNull()
    const zero = toExpenseInput(baseValues({ splitType: SplitTypes.CLAIM, unitPrice: '0' }))
    expect(zero.unitPrice).toBeNull()
    const set = toExpenseInput(baseValues({ splitType: SplitTypes.CLAIM, unitPrice: '7' }))
    expect(set.unitPrice).toBe(7)
  })

  it('trims the note', () => {
    expect(toExpenseInput(baseValues({ note: '  Dinner  ' })).note).toBe('Dinner')
  })
})

describe('expenseFormSchema', () => {
  it('rejects a non-positive amount', () => {
    const result = expenseFormSchema.safeParse(baseValues({ amount: '0' }))
    expect(result.success).toBe(false)
  })

  it('rejects a missing payer', () => {
    const result = expenseFormSchema.safeParse(baseValues({ payerId: '' }))
    expect(result.success).toBe(false)
  })

  it('rejects a blank note', () => {
    const result = expenseFormSchema.safeParse(baseValues({ note: '' }))
    expect(result.success).toBe(false)
  })

  it('rejects a whitespace-only note', () => {
    const result = expenseFormSchema.safeParse(baseValues({ note: '   ' }))
    expect(result.success).toBe(false)
  })

  it('rejects EQUAL with nobody selected', () => {
    const result = expenseFormSchema.safeParse(baseValues({ equalParticipantIds: [] }))
    expect(result.success).toBe(false)
  })

  it('rejects EXACT with nobody selected', () => {
    const result = expenseFormSchema.safeParse(
      baseValues({ splitType: SplitTypes.EXACT, exactParticipantIds: [] }),
    )
    expect(result.success).toBe(false)
  })

  it('rejects EXACT when the entered amounts do not add up to the total', () => {
    const result = expenseFormSchema.safeParse(
      baseValues({
        splitType: SplitTypes.EXACT,
        exactParticipantIds: ['kavin', 'mohan'],
        exactAmounts: { kavin: '50', mohan: '40' },
      }),
    )
    expect(result.success).toBe(false)
  })

  it('accepts EXACT when the entered amounts add up to the total', () => {
    const result = expenseFormSchema.safeParse(
      baseValues({
        splitType: SplitTypes.EXACT,
        exactParticipantIds: ['kavin', 'mohan'],
        exactAmounts: { kavin: '60', mohan: '40' },
      }),
    )
    expect(result.success).toBe(true)
  })

  it('accepts CLAIM regardless of participant selection', () => {
    const result = expenseFormSchema.safeParse(baseValues({ splitType: SplitTypes.CLAIM }))
    expect(result.success).toBe(true)
  })

  it('accepts a valid EQUAL form', () => {
    expect(expenseFormSchema.safeParse(baseValues()).success).toBe(true)
  })
})
