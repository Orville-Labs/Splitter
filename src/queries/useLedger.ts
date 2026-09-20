import { useMemo } from 'react'

import type { Ledger } from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'

import { useCategoriesQuery } from './useCategoriesQuery'
import { useExpensesQuery } from './useExpensesQuery'
import { useMembersQuery } from './useMembersQuery'
import { useSettlementsQuery } from './useSettlementsQuery'

/**
 * Assembles the pure domain `Ledger` (for computeBalances/computeSettlements)
 * and the `NameLookup` (for buildBreakdown/categoryLabel) for one space,
 * from the four unscoped queries — mirrors the original app's `store.js`
 * grouping loops, just recomputed with `useMemo` instead of mutated once
 * at load time. Every table is already fully loaded (staleTime: Infinity),
 * so switching `spaceId` is a pure recompute, not a refetch.
 */
export function useLedger(spaceId: string | null) {
  const membersQuery = useMembersQuery()
  const categoriesQuery = useCategoriesQuery()
  const expensesQuery = useExpensesQuery()
  const settlementsQuery = useSettlementsQuery()

  const isLoading =
    membersQuery.isLoading ||
    categoriesQuery.isLoading ||
    expensesQuery.isLoading ||
    settlementsQuery.isLoading

  const isError =
    membersQuery.isError ||
    categoriesQuery.isError ||
    expensesQuery.isError ||
    settlementsQuery.isError

  const result = useMemo(() => {
    // Everyone in the space, active or removed — needed so a removed
    // member's name still resolves for old expenses/settlements that
    // reference them (see members.repository.ts's soft-delete comment).
    const everyMember = spaceId
      ? (membersQuery.data ?? []).filter((member) => member.spaceId === spaceId)
      : []
    // The active roster only — what pickers show and what
    // computeBalances seeds as "definitely a real person, even with a
    // zero balance." A removed member still surfaces in balances if
    // they have real history (computeBalances derives that from
    // expenses/settlements directly, not from this list), but no longer
    // appears as a selectable option or as a guaranteed zero-balance row.
    const members = everyMember.filter((member) => member.isActive)

    // Same active/all split as members: everyCategory resolves names for
    // old expenses tagged with a since-removed category; categories
    // (active only) is what the manage list and the expense-form picker
    // show.
    const everyCategory = spaceId
      ? (categoriesQuery.data ?? []).filter((category) => category.spaceId === spaceId)
      : []
    const categories = everyCategory.filter((category) => category.isActive)
    const expenses = spaceId ? (expensesQuery.data?.[spaceId] ?? []) : []
    const settlements = spaceId ? (settlementsQuery.data?.[spaceId] ?? []) : []

    const ledger: Ledger = {
      members: members.map((member) => member.id),
      expenses,
      settlements,
    }

    const names: NameLookup = {
      members: Object.fromEntries(everyMember.map((member) => [member.id, member.name])),
      categories: Object.fromEntries(everyCategory.map((category) => [category.id, category.name])),
    }

    return { members, categories, ledger, names }
  }, [spaceId, membersQuery.data, categoriesQuery.data, expensesQuery.data, settlementsQuery.data])

  return { ...result, isLoading, isError }
}
