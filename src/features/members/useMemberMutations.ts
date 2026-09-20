import { useMutation, useQueryClient } from '@tanstack/react-query'

import { addMember, removeMember, renameMember } from '@/data/members.repository'
import { queryKeys } from '@/queries/keys'

export function useAddMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ spaceId, name }: { spaceId: string; name: string }) => addMember(spaceId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.members }),
  })
}

/** A soft delete — see members.repository.ts's removeMember for why. */
export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => removeMember(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.members }),
  })
}

export function useRenameMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameMember(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.members }),
  })
}
