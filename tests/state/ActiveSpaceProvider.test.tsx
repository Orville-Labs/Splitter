import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { ACTIVE_SPACE_STORAGE_KEY } from '@/config/constants'
import { useActiveSpaceId } from '@/state/ActiveSpaceContext'
import { ActiveSpaceProvider } from '@/state/ActiveSpaceProvider'

beforeEach(() => {
  localStorage.clear()
})

describe('ActiveSpaceProvider', () => {
  it('starts with null when nothing is stored', () => {
    const { result } = renderHook(() => useActiveSpaceId(), { wrapper: ActiveSpaceProvider })
    expect(result.current.activeSpaceId).toBeNull()
  })

  it('reads a previously stored id on mount', () => {
    localStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, 'sp1')
    const { result } = renderHook(() => useActiveSpaceId(), { wrapper: ActiveSpaceProvider })
    expect(result.current.activeSpaceId).toBe('sp1')
  })

  it('persists a new id to localStorage when set', () => {
    const { result } = renderHook(() => useActiveSpaceId(), { wrapper: ActiveSpaceProvider })
    act(() => result.current.setActiveSpaceId('sp2'))
    expect(localStorage.getItem(ACTIVE_SPACE_STORAGE_KEY)).toBe('sp2')
  })
})
