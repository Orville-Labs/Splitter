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

const { ExpenseList } = await import('@/features/expenses/ExpenseList')

const names: NameLookup = {
  members: { m1: 'Kavin', m2: 'Mohan' },
  categories: { c1: 'Petrol' },
}

const equalExpense = {
  id: 'e1',
  amount: 900,
  payer: 'm1',
  categoryIds: ['c1'],
  splitType: 'EQUAL' as const,
  participants: ['m1', 'm2'],
  splitData: {},
  date: '2026-09-01',
  note: 'Fuel',
  unitPrice: null,
  claims: [],
}

const openClaimExpense = {
  id: 'e2',
  amount: 700,
  payer: 'm2',
  categoryIds: [],
  splitType: 'CLAIM' as const,
  participants: [],
  splitData: {},
  date: '2026-09-02',
  note: 'Eggs',
  unitPrice: 7,
  claims: [{ id: 'claim1', member: 'm1', amount: 210, qty: 30, date: '2026-09-02' }],
}

const doneClaimExpense = {
  ...openClaimExpense,
  id: 'e3',
  note: 'Eggs (done)',
  claims: [{ id: 'claim2', member: 'm1', amount: 700, qty: 100, date: '2026-09-02' }],
}

beforeEach(() => {
  fake = createFakeSupabase({
    expenses: [
      {
        id: 'e1',
        space_id: 'sp1',
        payer_id: 'm1',
        amount: 900,
        split_type: 'EQUAL',
        unit_price: null,
        expense_date: '2026-09-01',
        note: 'Fuel',
        created_at: '2026-09-01',
      },
    ],
  })
})

function renderList(ledger: Ledger, onEdit = vi.fn(), onClaim = vi.fn()) {
  const { Wrapper } = createTestWrapper()
  render(
    <Wrapper>
      <ExpenseList ledger={ledger} names={names} onEdit={onEdit} onClaim={onClaim} />
    </Wrapper>,
  )
  return { onEdit, onClaim }
}

describe('ExpenseList', () => {
  it('shows an empty state with no expenses', () => {
    renderList({ members: ['m1', 'm2'], expenses: [], settlements: [] })
    expect(screen.getByText('No expenses yet — add your first one above.')).toBeInTheDocument()
    expect(screen.queryByText('Active claims')).not.toBeInTheDocument()
  })

  it('lists a non-claim expense under Recent entries, with the payer and category', () => {
    renderList({ members: ['m1', 'm2'], expenses: [equalExpense], settlements: [] })
    expect(screen.getByText('Fuel')).toBeInTheDocument()
    expect(screen.getByText('Kavin paid · Petrol · 2026-09-01')).toBeInTheDocument()
    expect(screen.getByText('₹900.00')).toBeInTheDocument()
  })

  it('puts a still-open claim in Active claims, not Recent entries', () => {
    renderList({ members: ['m1', 'm2'], expenses: [openClaimExpense], settlements: [] })
    expect(screen.getByText('Active claims')).toBeInTheDocument()
    expect(screen.getByText('Claim')).toBeInTheDocument()
    expect(screen.getByText('₹210.00 claimed · ₹490.00 remaining')).toBeInTheDocument()
    expect(screen.getByText('No expenses yet — add your first one above.')).toBeInTheDocument()
  })

  it('moves a fully-claimed expense into Recent entries as "Claimed"', () => {
    renderList({ members: ['m1', 'm2'], expenses: [doneClaimExpense], settlements: [] })
    expect(screen.queryByText('Active claims')).not.toBeInTheDocument()
    expect(screen.getByText('Claimed')).toBeInTheDocument()
    expect(screen.getByText('Eggs (done)')).toBeInTheDocument()
  })

  it('opens the edit sheet when a non-claim row is clicked', async () => {
    const user = userEvent.setup()
    const { onEdit } = renderList({
      members: ['m1', 'm2'],
      expenses: [equalExpense],
      settlements: [],
    })

    await user.click(screen.getByText('Fuel'))

    expect(onEdit).toHaveBeenCalledWith(equalExpense)
  })

  it('opens the claim modal when an open-claim row is clicked', async () => {
    const user = userEvent.setup()
    const { onClaim } = renderList({
      members: ['m1', 'm2'],
      expenses: [openClaimExpense],
      settlements: [],
    })

    await user.click(screen.getByText('Eggs'))

    expect(onClaim).toHaveBeenCalledWith(openClaimExpense)
  })

  it('edits via the row action without triggering the row click', async () => {
    const user = userEvent.setup()
    const { onEdit } = renderList({
      members: ['m1', 'm2'],
      expenses: [equalExpense],
      settlements: [],
    })

    await user.click(screen.getByRole('button', { name: 'Edit Fuel' }))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('deletes an expense after confirming', async () => {
    const user = userEvent.setup()
    renderList({ members: ['m1', 'm2'], expenses: [equalExpense], settlements: [] })

    await user.click(screen.getByRole('button', { name: 'Delete Fuel' }))
    await user.click(await screen.findByRole('button', { name: 'Delete', exact: true }))

    await waitFor(() => expect(fake.tables.expenses).toHaveLength(0))
  })

  describe('progressive disclosure', () => {
    function manyExpenses(count: number) {
      return Array.from({ length: count }, (_, index) => ({
        ...equalExpense,
        id: `e${index}`,
        note: `Expense ${index}`,
        date: `2026-09-${String(index + 1).padStart(2, '0')}`,
      }))
    }

    it('shows no "Show more" toggle at or under the collapsed count', () => {
      renderList({ members: ['m1', 'm2'], expenses: manyExpenses(3), settlements: [] })
      expect(screen.queryByRole('button', { name: /show/i })).not.toBeInTheDocument()
    })

    it('shows only the collapsed count, with a toggle for the rest', () => {
      renderList({ members: ['m1', 'm2'], expenses: manyExpenses(5), settlements: [] })

      expect(screen.getByText('Expense 0')).toBeInTheDocument()
      expect(screen.getByText('Expense 1')).toBeInTheDocument()
      expect(screen.getByText('Expense 2')).toBeInTheDocument()
      expect(screen.queryByText('Expense 3')).not.toBeInTheDocument()
      expect(screen.queryByText('Expense 4')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Show 2 more' })).toBeInTheDocument()
    })

    it('reveals the rest on click, then collapses back on a second click', async () => {
      const user = userEvent.setup()
      renderList({ members: ['m1', 'm2'], expenses: manyExpenses(5), settlements: [] })

      await user.click(screen.getByRole('button', { name: 'Show 2 more' }))
      expect(screen.getByText('Expense 3')).toBeInTheDocument()
      expect(screen.getByText('Expense 4')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Show less' }))
      expect(screen.queryByText('Expense 3')).not.toBeInTheDocument()
      expect(screen.queryByText('Expense 4')).not.toBeInTheDocument()
    })
  })
})
