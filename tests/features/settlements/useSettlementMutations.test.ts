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

const { useCreateSettlement, useDeleteSettlement, useUpdateSettlement } =
  await import('@/features/settlements/useSettlementMutations')

beforeEach(() => {
  fake = createFakeSupabase()
})

describe('useSettlementMutations', () => {
  it('creates a settlement', async () => {
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useCreateSettlement(), { wrapper: Wrapper })

    act(() =>
      result.current.mutate({
        spaceId: 'sp1',
        params: { from: 'm1', to: 'm2', amount: 100, date: '2026-09-03' },
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.settlements).toHaveLength(1)
    expect(fake.tables.settlements[0]).toMatchObject({
      space_id: 'sp1',
      from_member_id: 'm1',
      to_member_id: 'm2',
      amount: 100,
    })
  })

  it('updates a settlement', async () => {
    fake.tables.settlements.push({
      id: 's1',
      space_id: 'sp1',
      from_member_id: 'm1',
      to_member_id: 'm2',
      amount: 100,
      settlement_date: '2026-09-03',
      created_at: '2026-09-03',
    })
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useUpdateSettlement(), { wrapper: Wrapper })

    act(() => result.current.mutate({ id: 's1', params: { from: 'm2', to: 'm1', amount: 175 } }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.settlements[0]).toMatchObject({
      from_member_id: 'm2',
      to_member_id: 'm1',
      amount: 175,
    })
  })

  it('deletes a settlement', async () => {
    fake.tables.settlements.push({
      id: 's1',
      space_id: 'sp1',
      from_member_id: 'm1',
      to_member_id: 'm2',
      amount: 100,
      settlement_date: '2026-09-03',
      created_at: '2026-09-03',
    })
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useDeleteSettlement(), { wrapper: Wrapper })

    act(() => result.current.mutate('s1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.settlements).toHaveLength(0)
  })
})
