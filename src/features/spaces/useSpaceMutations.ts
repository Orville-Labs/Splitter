import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteSpace, renameSpace } from '@/data/spaces.repository'
import { queryKeys } from '@/queries/keys'
import { createSpaceWithDefaultCategories } from '@/queries/spaceOperations'
import { useSession } from '@/state/SessionContext'

export function useCreateSpace() {
  const { user } = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, position }: { name: string; position: number }) => {
      if (!user) throw new Error('No signed-in user')
      return createSpaceWithDefaultCategories(user.id, name, position)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
    },
  })
}

export function useRenameSpace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameSpace(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.spaces }),
  })
}

/**
 * Cascades to members, categories, expenses (+ join tables), claims and
 * settlements at the DB level — every one of those caches must be
 * invalidated, not just spaces, or stale rows from the deleted space
 * would linger in memory until something else happens to refetch them.
 */
export function useDeleteSpace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteSpace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces })
      queryClient.invalidateQueries({ queryKey: queryKeys.members })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses })
      queryClient.invalidateQueries({ queryKey: queryKeys.settlements })
    },
  })
}
