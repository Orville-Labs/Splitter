import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Expense } from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'
import { createFakeSupabase } from '../../helpers/fakeSupabase'
import { createTestWrapper } from '../../helpers/renderWithProviders'

let fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { EditExpenseSheet } = await import('@/features/expenses/EditExpenseSheet')

const members = [
  { id: 'm1', spaceId: 'sp1', name: 'Kavin', isActive: true },
  { id: 'm2', spaceId: 'sp1', name: 'Mohan', isActive: true },
]
const categories = [{ id: 'c1', spaceId: 'sp1', name: 'Petrol', position: 0, isActive: true }]
const names: NameLookup = { members: { m1: 'Kavin', m2: 'Mohan' }, categories: { c1: 'Petrol' } }

const equalExpense: Expense = {
  id: 'e1',
  amount: 900,
  payer: 'm1',
  categoryIds: ['c1'],
  splitType: 'EQUAL',
  participants: ['m1', 'm2'],
  splitData: {},
  date: '2026-09-01',
  note: 'Fuel',
  unitPrice: null,
  claims: [],
}

const claimExpense: Expense = {
  ...equalExpense,
  id: 'e2',
  splitType: 'CLAIM',
  participants: [],
  unitPrice: 7,
  claims: [{ id: 'claim1', member: 'm1', amount: 21, qty: 3, date: '2026-09-01' }],
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
      {
        id: 'e2',
        space_id: 'sp1',
        payer_id: 'm1',
        amount: 900,
        split_type: 'CLAIM',
        unit_price: 7,
        expense_date: '2026-09-01',
        note: 'Fuel',
        created_at: '2026-09-01',
      },
    ],
    expense_participants: [
      { expense_id: 'e1', member_id: 'm1' },
      { expense_id: 'e1', member_id: 'm2' },
    ],
    expense_categories: [{ expense_id: 'e1', category_id: 'c1' }],
    claims: [
      {
        id: 'claim1',
        expense_id: 'e2',
        member_id: 'm1',
        amount: 21,
        qty: 3,
        claim_date: '2026-09-01',
      },
    ],
  })
})

function renderSheet(expense: Expense | null, onOpenChange = vi.fn()) {
  const { Wrapper } = createTestWrapper()
  render(
    <Wrapper>
      <EditExpenseSheet
        open={expense !== null}
        onOpenChange={onOpenChange}
        spaceId="sp1"
        members={members}
        categories={categories}
        expense={expense}
        names={names}
        onManageCategories={vi.fn()}
      />
    </Wrapper>,
  )
  return { onOpenChange }
}

describe('EditExpenseSheet', () => {
  it('prefills the form from the expense and saves an edit', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderSheet(equalExpense)

    expect(screen.getByLabelText('Amount')).toHaveValue(900)
    expect(screen.getByDisplayValue('Fuel')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Note'))
    await user.type(screen.getByLabelText('Note'), 'Fuel (updated)')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(fake.tables.expenses.find((e) => e.id === 'e1')?.note).toBe('Fuel (updated)'),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('locks the split editor for a CLAIM expense, leaving only the unit price', async () => {
    renderSheet(claimExpense)

    expect(screen.queryByRole('button', { name: 'Equal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Exact' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Unit price (optional)')).toHaveValue(7)
  })

  describe('contributions (CLAIM expenses)', () => {
    it('shows who claimed how much, resolved to display names', () => {
      renderSheet(claimExpense)

      expect(screen.getByText('Kavin · 3 × ₹7.00')).toBeInTheDocument()
      expect(screen.getByText(/₹21\.00 of ₹900\.00 claimed/)).toBeInTheDocument()
    })

    it('shows an empty state when nothing has been claimed yet', () => {
      renderSheet({ ...claimExpense, claims: [] })
      expect(screen.getByText('No contributions logged yet.')).toBeInTheDocument()
    })

    it('removes a mistaken contribution', async () => {
      const user = userEvent.setup()
      renderSheet(claimExpense)

      await user.click(screen.getByRole('button', { name: 'Remove claim from Kavin' }))

      await waitFor(() => expect(fake.tables.claims).toHaveLength(0))
    })
  })

  it('cancels without saving', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderSheet(equalExpense)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(fake.tables.expenses.find((e) => e.id === 'e1')?.note).toBe('Fuel')
  })

  it('deletes the expense after confirming', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderSheet(equalExpense)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete', exact: true }))

    await waitFor(() => expect(fake.tables.expenses.find((e) => e.id === 'e1')).toBeUndefined())
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
