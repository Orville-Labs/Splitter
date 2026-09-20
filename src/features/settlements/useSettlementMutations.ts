import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createSettlement, deleteSettlement, updateSettlement } from '@/data/settlements.repository'
import { queryKeys } from '@/queries/keys'

export function useCreateSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      spaceId,
      params,
    }: {
      spaceId: string
      params: { from: string; to: string; amount: number; date: string }
    }) => createSettlement(spaceId, params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settlements }),
  })
}

export function useUpdateSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      params,
    }: {
      id: string
      params: { from: string; to: string; amount: number }
    }) => updateSettlement(id, params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settlements }),
  })
}

export function useDeleteSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteSettlement(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settlements }),
  })
}
