import { renderHook, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeSupabase } from '../../helpers/fakeSupabase'
import { createTestWrapper } from '../../helpers/renderWithProviders'

let fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { useAddMember, useRemoveMember, useRenameMember } =
  await import('@/features/members/useMemberMutations')

beforeEach(() => {
  fake = createFakeSupabase()
})

describe('useMemberMutations', () => {
  it('adds a member and invalidates the members query', async () => {
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useAddMember(), { wrapper: Wrapper })

    act(() => result.current.mutate({ spaceId: 'sp1', name: 'Kavin' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.members).toHaveLength(1)
    expect(fake.tables.members[0].name).toBe('Kavin')
  })

  it('removes a member as a soft delete', async () => {
    fake.tables.members.push({
      id: 'm1',
      space_id: 'sp1',
      name: 'Kavin',
      created_at: '2026-01-01',
      is_active: true,
    })
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useRemoveMember(), { wrapper: Wrapper })

    act(() => result.current.mutate('m1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.members).toHaveLength(1)
    expect(fake.tables.members[0].is_active).toBe(false)
  })

  it('renames a member', async () => {
    fake.tables.members.push({
      id: 'm1',
      space_id: 'sp1',
      name: 'Kavin',
      created_at: '2026-01-01',
      is_active: true,
    })
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useRenameMember(), { wrapper: Wrapper })

    act(() => result.current.mutate({ id: 'm1', name: 'Kavin R' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.members[0].name).toBe('Kavin R')
  })
})
