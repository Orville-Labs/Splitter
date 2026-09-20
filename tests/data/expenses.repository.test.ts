import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '../helpers/fakeSupabase'

const fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { createExpense, deleteExpense, listAllExpenses, updateExpense } =
  await import('@/data/expenses.repository')
const { createClaim } = await import('@/data/claims.repository')

beforeEach(() => {
  Object.assign(fake, createFakeSupabase())
})

describe('expenses.repository', () => {
  it('creates an EQUAL split atomically via the create_expense RPC', async () => {
    const id = await createExpense('sp1', {
      payerId: 'kavin',
      amount: 900,
      splitType: 'EQUAL',
      unitPrice: null,
      date: '2026-09-01',
      note: 'Fuel',
      categoryIds: ['petrol'],
      participantIds: ['kavin', 'kishore', 'mohan'],
      shares: {},
    })

    expect(fake.rpcCalls).toHaveLength(1)
    expect(fake.rpcCalls[0].name).toBe('create_expense')

    const [expense] = (await listAllExpenses()).sp1
    expect(expense).toMatchObject({
      id,
      amount: 900,
      payer: 'kavin',
      categoryIds: ['petrol'],
      splitType: 'EQUAL',
      participants: ['kavin', 'kishore', 'mohan'],
      splitData: {},
      note: 'Fuel',
    })
  })

  it('creates an EXACT split with the entered per-member amounts', async () => {
    await createExpense('sp1', {
      payerId: 'kishore',
      amount: 900,
      splitType: 'EXACT',
      unitPrice: null,
      date: '2026-08-20',
      note: '',
      categoryIds: [],
      participantIds: [],
      shares: { kishore: 300, mohan: 600 },
    })

    const [expense] = (await listAllExpenses()).sp1
    expect(expense.splitType).toBe('EXACT')
    expect(expense.splitData).toEqual({ kishore: 300, mohan: 600 })
    expect(expense.participants.sort()).toEqual(['kishore', 'mohan'])
  })

  it('creates a CLAIM expense with no participant/share rows, ready for contributions', async () => {
    const expenseId = await createExpense('sp1', {
      payerId: 'mohan',
      amount: 700,
      splitType: 'CLAIM',
      unitPrice: 7,
      date: '2026-09-02',
      note: 'Eggs',
      categoryIds: ['egg'],
      participantIds: [],
      shares: {},
    })

    const [expense] = (await listAllExpenses()).sp1
    expect(expense.participants).toEqual([])
    expect(expense.claims).toEqual([])

    await createClaim({ expenseId, memberId: 'kavin', amount: 210, qty: 30, date: '2026-09-02' })
    const [withClaim] = (await listAllExpenses()).sp1
    expect(withClaim.claims).toEqual([
      { id: withClaim.claims[0].id, member: 'kavin', amount: 210, qty: 30, date: '2026-09-02' },
    ])
  })

  it('editing an expense replaces its categories/split wholesale but never touches claims', async () => {
    const expenseId = await createExpense('sp1', {
      payerId: 'mohan',
      amount: 700,
      splitType: 'CLAIM',
      unitPrice: 7,
      date: '2026-09-02',
      note: 'Eggs',
      categoryIds: ['egg'],
      participantIds: [],
      shares: {},
    })
    await createClaim({ expenseId, memberId: 'kavin', amount: 210, qty: 30, date: '2026-09-02' })

    await updateExpense(expenseId, {
      payerId: 'mohan',
      amount: 700,
      splitType: 'CLAIM',
      unitPrice: 9,
      date: '2026-09-02',
      note: 'Eggs (updated)',
      categoryIds: ['egg'],
      participantIds: [],
      shares: {},
    })

    const [expense] = (await listAllExpenses()).sp1
    expect(expense.unitPrice).toBe(9)
    expect(expense.note).toBe('Eggs (updated)')
    // The contribution logged before the edit must survive untouched.
    expect(expense.claims).toHaveLength(1)
    expect(expense.claims[0].amount).toBe(210)
  })

  it('switching an expense from EQUAL to EXACT on edit replaces the split rows', async () => {
    const expenseId = await createExpense('sp1', {
      payerId: 'kavin',
      amount: 900,
      splitType: 'EQUAL',
      unitPrice: null,
      date: '2026-09-01',
      note: '',
      categoryIds: [],
      participantIds: ['kavin', 'kishore', 'mohan'],
      shares: {},
    })

    await updateExpense(expenseId, {
      payerId: 'kavin',
      amount: 1200,
      splitType: 'EXACT',
      unitPrice: null,
      date: '2026-09-01',
      note: '',
      categoryIds: [],
      participantIds: [],
      shares: { kavin: 600, kishore: 300, mohan: 300 },
    })

    const [expense] = (await listAllExpenses()).sp1
    expect(expense.splitType).toBe('EXACT')
    expect(expense.splitData).toEqual({ kavin: 600, kishore: 300, mohan: 300 })
    expect(fake.tables.expense_participants).toHaveLength(0)
  })

  it('deleting an expense cascades to its categories, participants, shares and claims', async () => {
    const expenseId = await createExpense('sp1', {
      payerId: 'mohan',
      amount: 700,
      splitType: 'CLAIM',
      unitPrice: 7,
      date: '2026-09-02',
      note: '',
      categoryIds: ['egg'],
      participantIds: [],
      shares: {},
    })
    await createClaim({ expenseId, memberId: 'kavin', amount: 210, qty: 30, date: '2026-09-02' })

    await deleteExpense(expenseId)

    expect(fake.tables.expenses).toHaveLength(0)
    expect(fake.tables.expense_categories).toHaveLength(0)
    expect(fake.tables.claims).toHaveLength(0)
  })

  it('groups expenses by space_id, since the domain Expense shape carries no space id', async () => {
    await createExpense('sp1', {
      payerId: 'kavin',
      amount: 100,
      splitType: 'EQUAL',
      unitPrice: null,
      date: '2026-09-01',
      note: 'Space 1 expense',
      categoryIds: [],
      participantIds: ['kavin'],
      shares: {},
    })
    await createExpense('sp2', {
      payerId: 'mohan',
      amount: 200,
      splitType: 'EQUAL',
      unitPrice: null,
      date: '2026-09-01',
      note: 'Space 2 expense',
      categoryIds: [],
      participantIds: ['mohan'],
      shares: {},
    })

    const grouped = await listAllExpenses()
    expect(Object.keys(grouped).sort()).toEqual(['sp1', 'sp2'])
    expect(grouped.sp1).toHaveLength(1)
    expect(grouped.sp1[0].note).toBe('Space 1 expense')
    expect(grouped.sp2).toHaveLength(1)
    expect(grouped.sp2[0].note).toBe('Space 2 expense')
  })
})
