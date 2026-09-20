import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createClaim, deleteClaim } from '@/data/claims.repository'
import { queryKeys } from '@/queries/keys'

/**
 * Claims aren't their own query — `listAllExpenses` embeds each expense's
 * claims directly (see expenses.repository.ts), so invalidating
 * `queryKeys.expenses` is what refetches them.
 */
export function useCreateClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      expenseId: string
      memberId: string
      amount: number
      qty: number | null
      date: string
    }) => createClaim(params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses }),
  })
}

export function useDeleteClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteClaim(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses }),
  })
}
