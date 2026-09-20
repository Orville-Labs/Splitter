import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import { useActiveSpaceId } from '@/state/ActiveSpaceContext'
import { useSession } from '@/state/SessionContext'

import { queryKeys } from './keys'
import { createSpaceWithDefaultCategories } from './spaceOperations'
import { useSpacesQuery } from './useSpacesQuery'

/**
 * The list of spaces, the *resolved* active space id (falling back to the
 * first space if the stored id no longer exists, or if there is no
 * stored id yet — mirrors the original app's `preferredSpaceId()`), and
 * the one-time bootstrap for a brand-new user who owns zero spaces
 * (mirrors the original's `main.js`: "a brand-new project has no spaces
 * yet — create the first one," seeded with the default categories).
 */
export function useSpaces() {
  const { user } = useSession()
  const spacesQuery = useSpacesQuery()
  const { activeSpaceId: storedId, setActiveSpaceId } = useActiveSpaceId()
  const queryClient = useQueryClient()

  const bootstrap = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No signed-in user')
      return createSpaceWithDefaultCategories(user.id, 'My Group', 0)
    },
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      setActiveSpaceId(space.id)
    },
  })

  // Memoized so a re-render during the loading state (where `.data` is
  // undefined and `?? []` would otherwise mint a new array every time)
  // doesn't also invalidate the `activeSpaceId` memo below.
  const spaces = useMemo(() => spacesQuery.data ?? [], [spacesQuery.data])
  const hasLoadedEmpty = spacesQuery.isSuccess && spaces.length === 0

  useEffect(() => {
    if (hasLoadedEmpty && !bootstrap.isPending && !bootstrap.isSuccess) {
      bootstrap.mutate()
    }
    // bootstrap itself is intentionally excluded — including it would
    // re-run this effect on every internal mutation-state change it
    // causes, when all this effect cares about is "did the space list
    // just load empty".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedEmpty])

  const activeSpaceId = useMemo(() => {
    if (spaces.length === 0) return null
    if (storedId && spaces.some((space) => space.id === storedId)) return storedId
    return spaces[0].id
  }, [spaces, storedId])

  return {
    spaces,
    activeSpaceId,
    setActiveSpaceId,
    isLoading: spacesQuery.isLoading || bootstrap.isPending,
    isError: spacesQuery.isError || bootstrap.isError,
  }
}
