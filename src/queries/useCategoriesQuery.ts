import { useQuery } from '@tanstack/react-query'

import { listAllCategories } from '@/data/categories.repository'

import { queryKeys } from './keys'

export function useCategoriesQuery() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: listAllCategories })
}
