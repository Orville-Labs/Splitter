import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeSupabase } from '../../helpers/fakeSupabase'
import { createTestWrapper } from '../../helpers/renderWithProviders'

let fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { useCreateExpense, useDeleteExpense, useUpdateExpense } =
  await import('@/features/expenses/useExpenseMutations')

const input = {
  payerId: 'kavin',
  amount: 100,
  splitType: 'EQUAL' as const,
  unitPrice: null,
  date: '2026-09-01',
  note: '',
  categoryIds: [],
  participantIds: ['kavin'],
  shares: {},
}

beforeEach(() => {
  fake = createFakeSupabase()
})

describe('useExpenseMutations', () => {
  it('creates an expense via the create_expense RPC', async () => {
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useCreateExpense(), { wrapper: Wrapper })

    act(() => result.current.mutate({ spaceId: 'sp1', input }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.expenses).toHaveLength(1)
    expect(fake.tables.expenses[0].space_id).toBe('sp1')
  })

  it('updates an expense via the update_expense RPC, without touching claims', async () => {
    fake.tables.expenses.push({
      id: 'e1',
      space_id: 'sp1',
      payer_id: 'kavin',
      amount: 100,
      split_type: 'EQUAL',
      unit_price: null,
      expense_date: '2026-09-01',
      note: '',
      created_at: '2026-09-01',
    })
    fake.tables.claims.push({
      id: 'c1',
      expense_id: 'e1',
      member_id: 'kavin',
      amount: 10,
      qty: null,
      claim_date: '2026-09-01',
      created_at: '2026-09-01',
    })

    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useUpdateExpense(), { wrapper: Wrapper })

    act(() => result.current.mutate({ expenseId: 'e1', input: { ...input, note: 'Updated' } }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.expenses[0].note).toBe('Updated')
    expect(fake.tables.claims).toHaveLength(1)
  })

  it('deletes an expense, cascading to its children', async () => {
    fake.tables.expenses.push({
      id: 'e1',
      space_id: 'sp1',
      payer_id: 'kavin',
      amount: 100,
      split_type: 'EQUAL',
      unit_price: null,
      expense_date: '2026-09-01',
      note: '',
      created_at: '2026-09-01',
    })
    fake.tables.expense_participants.push({ expense_id: 'e1', member_id: 'kavin' })

    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useDeleteExpense(), { wrapper: Wrapper })

    act(() => result.current.mutate('e1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.expenses).toHaveLength(0)
    expect(fake.tables.expense_participants).toHaveLength(0)
  })
})
