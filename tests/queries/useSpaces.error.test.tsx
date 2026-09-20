import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createTestWrapper } from '../helpers/renderWithProviders'

vi.mock('@/data/spaces.repository', () => ({
  listSpaces: () => Promise.reject(new Error('network down')),
  createSpace: vi.fn(),
}))

const { useSpaces } = await import('@/queries/useSpaces')

describe('useSpaces (query failure)', () => {
  it('surfaces isError instead of silently treating the failure as zero spaces', async () => {
    const { Wrapper } = createTestWrapper('owner-1')
    const { result } = renderHook(() => useSpaces(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.spaces).toHaveLength(0)
    expect(result.current.activeSpaceId).toBeNull()
  })
})
