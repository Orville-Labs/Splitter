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

const { useCreateClaim, useDeleteClaim } = await import('@/features/expenses/useClaimMutations')

beforeEach(() => {
  fake = createFakeSupabase()
})

describe('useClaimMutations', () => {
  it('creates a claim', async () => {
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useCreateClaim(), { wrapper: Wrapper })

    act(() =>
      result.current.mutate({
        expenseId: 'e1',
        memberId: 'kavin',
        amount: 210,
        qty: 30,
        date: '2026-09-02',
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.claims).toHaveLength(1)
    expect(fake.tables.claims[0]).toMatchObject({
      expense_id: 'e1',
      member_id: 'kavin',
      amount: 210,
    })
  })

  it('deletes a claim', async () => {
    fake.tables.claims.push({
      id: 'c1',
      expense_id: 'e1',
      member_id: 'kavin',
      amount: 210,
      qty: 30,
      claim_date: '2026-09-02',
      created_at: '2026-09-02',
    })

    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useDeleteClaim(), { wrapper: Wrapper })

    act(() => result.current.mutate('c1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.claims).toHaveLength(0)
  })
})
