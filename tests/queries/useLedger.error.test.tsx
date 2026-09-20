import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createFakeSupabase } from '../helpers/fakeSupabase'
import { createTestWrapper } from '../helpers/renderWithProviders'

const fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

vi.mock('@/data/members.repository', () => ({
  listAllMembers: () => Promise.reject(new Error('network down')),
}))

const { useLedger } = await import('@/queries/useLedger')

describe('useLedger (query failure)', () => {
  it('surfaces isError instead of silently rendering an empty ledger', async () => {
    const { Wrapper } = createTestWrapper('owner-1')
    const { result } = renderHook(() => useLedger('sp1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.members).toHaveLength(0)
    expect(result.current.ledger.expenses).toHaveLength(0)
  })
})
