import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeSupabase } from '../helpers/fakeSupabase'
import { createTestWrapper } from '../helpers/renderWithProviders'

let fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { ACTIVE_SPACE_STORAGE_KEY } = await import('@/config/constants')
const { useSpaces } = await import('@/queries/useSpaces')

beforeEach(() => {
  fake = createFakeSupabase()
  localStorage.clear()
})

describe('useSpaces', () => {
  it('auto-creates a default space seeded with the default categories when the user owns none', async () => {
    const { Wrapper } = createTestWrapper('owner-1')
    const { result } = renderHook(() => useSpaces(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.spaces).toHaveLength(1))

    const [space] = result.current.spaces
    expect(space.name).toBe('My Group')
    expect(space.ownerId).toBe('owner-1')
    expect(fake.tables.categories.filter((c) => c.space_id === space.id)).toHaveLength(7)
    expect(result.current.activeSpaceId).toBe(space.id)
  })

  it('does not bootstrap when the user already owns a space', async () => {
    fake.tables.spaces.push({
      id: 'sp1',
      owner_id: 'owner-1',
      name: 'Existing',
      position: 0,
      created_at: '2026-01-01',
    })
    const { Wrapper } = createTestWrapper('owner-1')
    const { result } = renderHook(() => useSpaces(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.spaces).toHaveLength(1)
    expect(result.current.spaces[0].name).toBe('Existing')
    expect(fake.tables.spaces).toHaveLength(1)
  })

  it('resolves the active space to the stored id when it still exists', async () => {
    fake.tables.spaces.push(
      { id: 'sp1', owner_id: 'owner-1', name: 'First', position: 0, created_at: '2026-01-01' },
      { id: 'sp2', owner_id: 'owner-1', name: 'Second', position: 1, created_at: '2026-01-02' },
    )
    localStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, 'sp2')
    const { Wrapper } = createTestWrapper('owner-1')
    const { result } = renderHook(() => useSpaces(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.spaces).toHaveLength(2))
    expect(result.current.activeSpaceId).toBe('sp2')
  })

  it('falls back to the first space when the stored id no longer exists', async () => {
    fake.tables.spaces.push({
      id: 'sp1',
      owner_id: 'owner-1',
      name: 'First',
      position: 0,
      created_at: '2026-01-01',
    })
    localStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, 'stale-id')
    const { Wrapper } = createTestWrapper('owner-1')
    const { result } = renderHook(() => useSpaces(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.spaces).toHaveLength(1))
    expect(result.current.activeSpaceId).toBe('sp1')
  })
})
