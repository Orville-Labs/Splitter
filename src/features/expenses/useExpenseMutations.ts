import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createExpense,
  deleteExpense,
  updateExpense,
  type ExpenseInput,
} from '@/data/expenses.repository'
import { queryKeys } from '@/queries/keys'

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ spaceId, input }: { spaceId: string; input: ExpenseInput }) =>
      createExpense(spaceId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses }),
  })
}

/** An edit never touches contributions already logged — updateExpense doesn't write to claims. */
export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ expenseId, input }: { expenseId: string; input: ExpenseInput }) =>
      updateExpense(expenseId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses }),
  })
}

/** Claims, categories, participants and shares all cascade via their FKs. */
export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses }),
  })
}
