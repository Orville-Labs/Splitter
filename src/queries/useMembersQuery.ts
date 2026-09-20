import { useQuery } from '@tanstack/react-query'

import { listAllMembers } from '@/data/members.repository'

import { queryKeys } from './keys'

export function useMembersQuery() {
  return useQuery({ queryKey: queryKeys.members, queryFn: listAllMembers })
}
