import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeSupabase } from '../helpers/fakeSupabase'
import { createTestWrapper } from '../helpers/renderWithProviders'

let fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { useLedger } = await import('@/queries/useLedger')

beforeEach(() => {
  fake = createFakeSupabase({
    members: [
      { id: 'm-kavin', space_id: 'sp1', name: 'Kavin', created_at: '2026-01-01', is_active: true },
      { id: 'm-mohan', space_id: 'sp1', name: 'Mohan', created_at: '2026-01-01', is_active: true },
      {
        id: 'm-removed',
        space_id: 'sp1',
        name: 'Removed Member',
        created_at: '2026-01-01',
        is_active: false,
      },
      {
        id: 'm-other',
        space_id: 'sp2',
        name: 'Someone Else',
        created_at: '2026-01-01',
        is_active: true,
      },
    ],
    categories: [
      {
        id: 'c-petrol',
        space_id: 'sp1',
        name: 'Petrol',
        position: 0,
        created_at: '2026-01-01',
        is_active: true,
      },
      {
        id: 'c-removed',
        space_id: 'sp1',
        name: 'Removed Category',
        position: 1,
        created_at: '2026-01-01',
        is_active: false,
      },
      {
        id: 'c-other',
        space_id: 'sp2',
        name: 'Other space category',
        position: 0,
        created_at: '2026-01-01',
        is_active: true,
      },
    ],
    expenses: [
      {
        id: 'e1',
        space_id: 'sp1',
        payer_id: 'm-kavin',
        amount: 100,
        split_type: 'EQUAL',
        unit_price: null,
        expense_date: '2026-09-01',
        note: 'Space 1 expense',
        created_at: '2026-09-01',
      },
      {
        id: 'e2',
        space_id: 'sp2',
        payer_id: 'm-other',
        amount: 50,
        split_type: 'EQUAL',
        unit_price: null,
        expense_date: '2026-09-01',
        note: 'Space 2 expense',
        created_at: '2026-09-01',
      },
    ],
    expense_participants: [
      { expense_id: 'e1', member_id: 'm-kavin' },
      { expense_id: 'e1', member_id: 'm-mohan' },
      { expense_id: 'e2', member_id: 'm-other' },
    ],
    settlements: [
      {
        id: 's1',
        space_id: 'sp1',
        from_member_id: 'm-mohan',
        to_member_id: 'm-kavin',
        amount: 50,
        settlement_date: '2026-09-02',
        created_at: '2026-09-02',
      },
    ],
  })
})

describe('useLedger', () => {
  it('scopes members, categories, expenses and settlements to the active space only', async () => {
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useLedger('sp1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.members.map((m) => m.name).sort()).toEqual(['Kavin', 'Mohan'])
    expect(result.current.categories.map((c) => c.name)).toEqual(['Petrol'])
    expect(result.current.ledger.expenses).toHaveLength(1)
    expect(result.current.ledger.expenses[0].note).toBe('Space 1 expense')
    expect(result.current.ledger.settlements).toHaveLength(1)
  })

  it('builds a NameLookup mapping member/category ids to display names', async () => {
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useLedger('sp1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.names.members['m-kavin']).toBe('Kavin')
    expect(result.current.names.members['m-mohan']).toBe('Mohan')
    expect(result.current.names.categories['c-petrol']).toBe('Petrol')
    // The other space's member/category must not leak into this lookup.
    expect(result.current.names.members['m-other']).toBeUndefined()
  })

  it('excludes removed (inactive) members from the roster, but still resolves their name', async () => {
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useLedger('sp1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Not in the active roster (picker lists, computeBalances's seed list) —
    expect(result.current.members.some((m) => m.id === 'm-removed')).toBe(false)
    // — but still resolvable by name, so old expenses/settlements that
    // reference them don't fall back to printing a raw id.
    expect(result.current.names.members['m-removed']).toBe('Removed Member')
  })

  it('excludes removed (inactive) categories from the manage list, but still resolves their name', async () => {
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useLedger('sp1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.categories.some((c) => c.id === 'c-removed')).toBe(false)
    expect(result.current.names.categories['c-removed']).toBe('Removed Category')
  })

  it('returns empty everything when there is no active space yet', async () => {
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useLedger(null), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.members).toEqual([])
    expect(result.current.ledger).toEqual({ members: [], expenses: [], settlements: [] })
  })

  it("computeBalances on the assembled ledger matches the space's own math", async () => {
    const { computeBalances } = await import('@/domain/balances')
    const { Wrapper } = createTestWrapper()
    const { result } = renderHook(() => useLedger('sp1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const balances = computeBalances(result.current.ledger)
    // Kavin paid 100, split equally with Mohan (50/50), then Mohan repaid 50.
    expect(balances['m-kavin']).toBe(0)
    expect(balances['m-mohan']).toBe(0)
  })
})
