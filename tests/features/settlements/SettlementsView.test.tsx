import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Ledger } from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'
import { createFakeSupabase } from '../../helpers/fakeSupabase'
import { createTestWrapper } from '../../helpers/renderWithProviders'

let fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const { SettlementsView } = await import('@/features/settlements/SettlementsView')
const { toast } = await import('sonner')

const members = [
  { id: 'm1', spaceId: 'sp1', name: 'Kavin', isActive: true },
  { id: 'm2', spaceId: 'sp1', name: 'Mohan', isActive: true },
]
const names: NameLookup = { members: { m1: 'Kavin', m2: 'Mohan' }, categories: {} }

const unbalancedLedger: Ledger = {
  members: ['m1', 'm2'],
  expenses: [
    {
      id: 'e1',
      amount: 100,
      payer: 'm1',
      categoryIds: [],
      splitType: 'EQUAL',
      participants: ['m1', 'm2'],
      splitData: {},
      date: '2026-09-01',
      note: '',
      unitPrice: null,
      claims: [],
    },
  ],
  settlements: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  fake = createFakeSupabase()
})

function renderView(ledger: Ledger, overrides = {}) {
  const { Wrapper } = createTestWrapper()
  const onOpenBreakdown = vi.fn()
  const onRecordNew = vi.fn()
  const onEditSettlement = vi.fn()
  render(
    <Wrapper>
      <SettlementsView
        ledger={ledger}
        members={members}
        names={names}
        onOpenBreakdown={onOpenBreakdown}
        onRecordNew={onRecordNew}
        onEditSettlement={onEditSettlement}
        {...overrides}
      />
    </Wrapper>,
  )
  return { onOpenBreakdown, onRecordNew, onEditSettlement }
}

describe('SettlementsView', () => {
  it("shows each member's balance with the right sign and status", () => {
    renderView(unbalancedLedger)

    expect(screen.getByRole('button', { name: /Kavin.*gets back/s })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mohan.*owes/s })).toBeInTheDocument()
  })

  it('opens the breakdown for a member when their balance card is clicked', async () => {
    const user = userEvent.setup()
    const { onOpenBreakdown } = renderView(unbalancedLedger)

    await user.click(screen.getByRole('button', { name: /Kavin/ }))

    expect(onOpenBreakdown).toHaveBeenCalledWith('m1')
  })

  it('shows a suggested transfer for an unbalanced ledger', () => {
    renderView(unbalancedLedger)
    expect(
      screen.getByText('₹50.00', { selector: 'span.text-sm.font-semibold' }),
    ).toBeInTheDocument()
  })

  it('says everyone is settled up when balances are all zero', () => {
    renderView({ members: ['m1', 'm2'], expenses: [], settlements: [] })
    expect(screen.getByText('Everyone is settled up.')).toBeInTheDocument()
  })

  it('shows an empty state with no recorded settlements', () => {
    renderView({ members: ['m1', 'm2'], expenses: [], settlements: [] })
    expect(screen.getByText('No settlements recorded yet.')).toBeInTheDocument()
  })

  it('calls onRecordNew when there are at least two members', async () => {
    const user = userEvent.setup()
    const { onRecordNew } = renderView(unbalancedLedger)

    await user.click(screen.getByRole('button', { name: /add settlement/i }))

    expect(onRecordNew).toHaveBeenCalled()
  })

  it('blocks recording a settlement with fewer than two members', async () => {
    const user = userEvent.setup()
    const { onRecordNew } = renderView(unbalancedLedger, { members: [members[0]] })

    await user.click(screen.getByRole('button', { name: /add settlement/i }))

    expect(onRecordNew).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Need at least two group members.')
  })

  it('opens the edit modal when a recorded settlement row is clicked', async () => {
    const user = userEvent.setup()
    const ledger: Ledger = {
      ...unbalancedLedger,
      settlements: [{ id: 's1', from: 'm2', to: 'm1', amount: 50, date: '2026-09-02' }],
    }
    const { onEditSettlement } = renderView(ledger)

    await user.click(screen.getByText('₹50.00', { selector: 'span.text-sm.font-semibold' }))

    expect(onEditSettlement).toHaveBeenCalledWith('s1')
  })

  it('deletes a recorded settlement after confirming', async () => {
    const user = userEvent.setup()
    fake.tables.settlements.push({
      id: 's1',
      space_id: 'sp1',
      from_member_id: 'm2',
      to_member_id: 'm1',
      amount: 50,
      settlement_date: '2026-09-02',
      created_at: '2026-09-02',
    })
    const ledger: Ledger = {
      ...unbalancedLedger,
      settlements: [{ id: 's1', from: 'm2', to: 'm1', amount: 50, date: '2026-09-02' }],
    }
    renderView(ledger)

    await user.click(screen.getByRole('button', { name: /delete settlement of/i }))
    await user.click(await screen.findByRole('button', { name: 'Delete', exact: true }))

    await waitFor(() => expect(fake.tables.settlements).toHaveLength(0))
  })

  describe('progressive disclosure', () => {
    function manySettlements(count: number) {
      return Array.from({ length: count }, (_, index) => ({
        id: `s${index}`,
        from: 'm2',
        to: 'm1',
        amount: index + 1,
        date: `2026-09-${String(index + 1).padStart(2, '0')}`,
      }))
    }

    it('shows no "Show more" toggle at or under the collapsed count', () => {
      renderView({ ...unbalancedLedger, settlements: manySettlements(3) })
      expect(screen.queryByRole('button', { name: /show/i })).not.toBeInTheDocument()
    })

    it('shows only the collapsed count, with a toggle for the rest', () => {
      renderView({ ...unbalancedLedger, settlements: manySettlements(5) })

      expect(screen.getByText('₹1.00')).toBeInTheDocument()
      expect(screen.getByText('₹2.00')).toBeInTheDocument()
      expect(screen.getByText('₹3.00')).toBeInTheDocument()
      expect(screen.queryByText('₹4.00')).not.toBeInTheDocument()
      expect(screen.queryByText('₹5.00')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Show 2 more' })).toBeInTheDocument()
    })

    it('reveals the rest on click, then collapses back on a second click', async () => {
      const user = userEvent.setup()
      renderView({ ...unbalancedLedger, settlements: manySettlements(5) })

      await user.click(screen.getByRole('button', { name: 'Show 2 more' }))
      expect(screen.getByText('₹4.00')).toBeInTheDocument()
      expect(screen.getByText('₹5.00')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Show less' }))
      expect(screen.queryByText('₹4.00')).not.toBeInTheDocument()
      expect(screen.queryByText('₹5.00')).not.toBeInTheDocument()
    })
  })
})
