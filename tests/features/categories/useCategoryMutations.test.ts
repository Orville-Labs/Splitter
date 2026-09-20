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

const { useAddCategory, useRemoveCategory, useRenameCategory, useReorderCategories } =
  await import('@/features/categories/useCategoryMutations')

beforeEach(() => {
  fake = createFakeSupabase()
})

describe('useCategoryMutations', () => {
  it('adds a category at a given position and invalidates the categories query', async () => {
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useAddCategory(), { wrapper: Wrapper })

    act(() => result.current.mutate({ spaceId: 'sp1', name: 'Groceries', position: 0 }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.categories).toHaveLength(1)
    expect(fake.tables.categories[0]).toMatchObject({ name: 'Groceries', position: 0 })
  })

  it('removes a category as a soft delete', async () => {
    fake.tables.categories.push({
      id: 'c1',
      space_id: 'sp1',
      name: 'Groceries',
      position: 0,
      created_at: '2026-01-01',
      is_active: true,
    })
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useRemoveCategory(), { wrapper: Wrapper })

    act(() => result.current.mutate('c1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.categories).toHaveLength(1)
    expect(fake.tables.categories[0].is_active).toBe(false)
  })

  it('renames a category', async () => {
    fake.tables.categories.push({
      id: 'c1',
      space_id: 'sp1',
      name: 'Groceries',
      position: 0,
      created_at: '2026-01-01',
      is_active: true,
    })
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useRenameCategory(), { wrapper: Wrapper })

    act(() => result.current.mutate({ id: 'c1', name: 'Food' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.tables.categories[0].name).toBe('Food')
  })

  it('reorders categories atomically via the set_category_order RPC', async () => {
    fake.tables.categories.push(
      {
        id: 'c1',
        space_id: 'sp1',
        name: 'Petrol',
        position: 0,
        created_at: '2026-01-01',
        is_active: true,
      },
      {
        id: 'c2',
        space_id: 'sp1',
        name: 'Egg',
        position: 1,
        created_at: '2026-01-01',
        is_active: true,
      },
    )
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useReorderCategories(), { wrapper: Wrapper })

    act(() => result.current.mutate({ spaceId: 'sp1', orderedIds: ['c2', 'c1'] }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fake.rpcCalls).toEqual([
      { name: 'set_category_order', args: { p_space_id: 'sp1', p_category_ids: ['c2', 'c1'] } },
    ])
  })
})
