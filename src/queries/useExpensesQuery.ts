import { useQuery } from '@tanstack/react-query'

import { listAllExpenses } from '@/data/expenses.repository'

import { queryKeys } from './keys'

/** Resolves to `Record<spaceId, Expense[]>` — see the repository's own comment for why. */
export function useExpensesQuery() {
  return useQuery({ queryKey: queryKeys.expenses, queryFn: listAllExpenses })
}
