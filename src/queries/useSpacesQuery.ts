import { useQuery } from '@tanstack/react-query'

import { listSpaces } from '@/data/spaces.repository'

import { queryKeys } from './keys'

export function useSpacesQuery() {
  return useQuery({ queryKey: queryKeys.spaces, queryFn: listSpaces })
}
