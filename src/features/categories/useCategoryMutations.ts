import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  addCategory,
  removeCategory,
  renameCategory,
  saveCategoryOrder,
} from '@/data/categories.repository'
import { queryKeys } from '@/queries/keys'

export function useAddCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      spaceId,
      name,
      position,
    }: {
      spaceId: string
      name: string
      position: number
    }) => addCategory(spaceId, name, position),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  })
}

export function useRenameCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameCategory(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  })
}

/** A soft delete — see categories.repository.ts's removeCategory for why. */
export function useRemoveCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => removeCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  })
}

export function useReorderCategories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ spaceId, orderedIds }: { spaceId: string; orderedIds: readonly string[] }) =>
      saveCategoryOrder(spaceId, orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  })
}
