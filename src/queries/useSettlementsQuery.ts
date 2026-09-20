import { useQuery } from '@tanstack/react-query'

import { listAllSettlements } from '@/data/settlements.repository'

import { queryKeys } from './keys'

/** Resolves to `Record<spaceId, Settlement[]>` — see the repository's own comment for why. */
export function useSettlementsQuery() {
  return useQuery({ queryKey: queryKeys.settlements, queryFn: listAllSettlements })
}
