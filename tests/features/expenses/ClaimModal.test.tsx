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

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const { ClaimModal } = await import('@/features/expenses/ClaimModal')
const { toast } = await import('sonner')

const members = [
  { id: 'm1', spaceId: 'sp1', name: 'Kavin', isActive: true },
  { id: 'm2', spaceId: 'sp1', name: 'Mohan', isActive: true },
]
const names: NameLookup = { members: { m1: 'Kavin', m2: 'Mohan' }, categories: {} }

const unitPriceExpense: Expense = {
  id: 'e1',
  amount: 700,
  payer: 'm2',
  categoryIds: [],
  splitType: 'CLAIM',
  participants: [],
  splitData: {},
  date: '2026-09-02',
  note: 'Eggs',
  unitPrice: 7,
  claims: [],
}

const cashExpense: Expense = { ...unitPriceExpense, id: 'e2', unitPrice: null, note: 'Pizza' }

beforeEach(() => {
  vi.clearAllMocks()
  fake = createFakeSupabase()
})

function renderModal(expense: Expense | null, onOpenChange = vi.fn()) {
  const { Wrapper } = createTestWrapper()
  render(
    <Wrapper>
      <ClaimModal
        open={expense !== null}
        onOpenChange={onOpenChange}
        expense={expense}
        members={members}
        names={names}
      />
    </Wrapper>,
  )
  return { onOpenChange }
}

describe('ClaimModal', () => {
  it('shows the quantity-based input and hint for a unit-priced expense', async () => {
    const user = userEvent.setup()
    renderModal(unitPriceExpense)

    expect(screen.getByLabelText('Quantity (₹7.00 each)')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Quantity (₹7.00 each)'), '30')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(fake.tables.claims).toHaveLength(1))
    expect(fake.tables.claims[0]).toMatchObject({
      expense_id: 'e1',
      member_id: 'm1',
      amount: 210,
      qty: 30,
    })
  })

  it('shows a plain amount input for a cash-based expense', async () => {
    const user = userEvent.setup()
    renderModal(cashExpense)

    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Amount'), '150')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(fake.tables.claims).toHaveLength(1))
    expect(fake.tables.claims[0]).toMatchObject({ amount: 150, qty: null })
  })

  it('lets a different member claim via the claimant tag row', async () => {
    const user = userEvent.setup()
    renderModal(cashExpense)

    await user.click(screen.getByRole('button', { name: 'Mohan' }))
    await user.type(screen.getByLabelText('Amount'), '100')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(fake.tables.claims).toHaveLength(1))
    expect(fake.tables.claims[0].member_id).toBe('m2')
  })

  it('blocks a cash claim that exceeds what remains, without creating it', async () => {
    const user = userEvent.setup()
    renderModal(cashExpense)

    await user.type(screen.getByLabelText('Amount'), '900')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('Only ₹700.00 remaining — enter that amount or less.')
    expect(fake.tables.claims).toHaveLength(0)
  })

  it('blocks a quantity claim that exceeds the remaining units, naming exactly how many are left', async () => {
    const user = userEvent.setup()
    const eggExpense: Expense = {
      ...unitPriceExpense,
      amount: 100,
      unitPrice: 10,
      claims: [{ id: 'c1', member: 'm2', amount: 90, qty: 9, date: '2026-09-01' }],
    }
    renderModal(eggExpense)

    await user.type(screen.getByLabelText('Quantity (₹10.00 each)'), '6')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('Only 1 unit remaining — enter 1 or fewer.')
    expect(fake.tables.claims).toHaveLength(0)
  })

  it('lists existing claims, most recent first, and removes one', async () => {
    const user = userEvent.setup()
    const expense: Expense = {
      ...cashExpense,
      claims: [
        { id: 'c1', member: 'm1', amount: 100, qty: null, date: '2026-09-01' },
        { id: 'c2', member: 'm2', amount: 200, qty: null, date: '2026-09-02' },
      ],
    }
    fake = createFakeSupabase({
      claims: [
        {
          id: 'c1',
          expense_id: 'e2',
          member_id: 'm1',
          amount: 100,
          qty: null,
          claim_date: '2026-09-01',
        },
        {
          id: 'c2',
          expense_id: 'e2',
          member_id: 'm2',
          amount: 200,
          qty: null,
          claim_date: '2026-09-02',
        },
      ],
    })
    renderModal(expense)

    const rows = screen.getAllByText(/Kavin|Mohan/).map((el) => el.textContent)
    expect(rows[0]).toContain('Mohan')

    await user.click(screen.getByRole('button', { name: 'Remove claim from Kavin' }))
    await waitFor(() => expect(fake.tables.claims).toHaveLength(1))
  })

  it('hides the claim form once the expense is fully claimed', () => {
    const doneExpense: Expense = {
      ...cashExpense,
      claims: [{ id: 'c1', member: 'm1', amount: 700, qty: null, date: '2026-09-01' }],
    }
    renderModal(doneExpense)

    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })
})
