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

const { useCreateSpace, useDeleteSpace, useRenameSpace } =
  await import('@/features/spaces/useSpaceMutations')

beforeEach(() => {
  fake = createFakeSupabase()
})

describe('useSpaceMutations', () => {
  it('creates a space owned by the signed-in user, seeded with the default categories', async () => {
    const { Wrapper } = createTestWrapper('owner-1')
    const { result } = renderHook(() => useCreateSpace(), { wrapper: Wrapper })

    act(() => result.current.mutate({ name: 'Goa Trip', position: 1 }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.spaces).toHaveLength(1)
    const space = fake.tables.spaces[0]
    expect(space).toMatchObject({ owner_id: 'owner-1', name: 'Goa Trip', position: 1 })
    expect(fake.tables.categories.filter((c) => c.space_id === space.id)).toHaveLength(7)
  })

  it('renames a space', async () => {
    fake.tables.spaces.push({
      id: 'sp1',
      owner_id: 'owner-1',
      name: 'My Group',
      position: 0,
      created_at: '2026-01-01',
    })
    const { Wrapper } = createTestWrapper('owner-1')
    const { result } = renderHook(() => useRenameSpace(), { wrapper: Wrapper })

    act(() => result.current.mutate({ id: 'sp1', name: 'Renamed' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.spaces[0].name).toBe('Renamed')
  })

  it('deletes a space, cascading to its members/categories/expenses/settlements', async () => {
    fake.tables.spaces.push({
      id: 'sp1',
      owner_id: 'owner-1',
      name: 'My Group',
      position: 0,
      created_at: '2026-01-01',
    })
    fake.tables.members.push({
      id: 'm1',
      space_id: 'sp1',
      name: 'Kavin',
      created_at: '2026-01-01',
      is_active: true,
    })
    const { Wrapper } = createTestWrapper('owner-1')
    const { result } = renderHook(() => useDeleteSpace(), { wrapper: Wrapper })

    act(() => result.current.mutate('sp1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.spaces).toHaveLength(0)
    expect(fake.tables.members).toHaveLength(0)
  })
})
