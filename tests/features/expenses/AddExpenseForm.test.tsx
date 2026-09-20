import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeSupabase } from '../../helpers/fakeSupabase'
import { createTestWrapper } from '../../helpers/renderWithProviders'

let fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { AddExpenseForm } = await import('@/features/expenses/AddExpenseForm')

const members = [
  { id: 'm1', spaceId: 'sp1', name: 'Kavin', isActive: true },
  { id: 'm2', spaceId: 'sp1', name: 'Mohan', isActive: true },
  { id: 'm3', spaceId: 'sp1', name: 'Kishore', isActive: true },
]
const categories = [
  { id: 'c1', spaceId: 'sp1', name: 'Petrol', position: 0, isActive: true },
  { id: 'c2', spaceId: 'sp1', name: 'Egg', position: 1, isActive: true },
]

beforeEach(() => {
  fake = createFakeSupabase()
})

function renderForm(onManageCategories = vi.fn(), categoryList = categories) {
  const { Wrapper } = createTestWrapper()
  render(
    <Wrapper>
      <AddExpenseForm
        spaceId="sp1"
        members={members}
        categories={categoryList}
        onManageCategories={onManageCategories}
      />
    </Wrapper>,
  )
  return { onManageCategories }
}

describe('AddExpenseForm', () => {
  it('adds an EQUAL-split expense across every member by default', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Amount'), '900')
    await user.type(screen.getByLabelText('Note'), 'Fuel')
    await user.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() => expect(fake.tables.expenses).toHaveLength(1))
    expect(fake.tables.expenses[0]).toMatchObject({
      space_id: 'sp1',
      amount: 900,
      payer_id: 'm1',
      split_type: 'EQUAL',
    })
    expect(fake.tables.expense_participants).toHaveLength(3)
  })

  it('resets the form after a successful save', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Amount'), '900')
    await user.type(screen.getByLabelText('Note'), 'Fuel')
    await user.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() => expect(fake.tables.expenses).toHaveLength(1))
    expect(screen.getByLabelText('Amount')).toHaveValue(null)
    expect(screen.getByLabelText('Note')).toHaveValue('')
  })

  it('rejects a zero amount without calling the server', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Add expense' }))

    expect(await screen.findByText('Enter a valid amount.')).toBeInTheDocument()
    expect(fake.tables.expenses).toHaveLength(0)
  })

  it('rejects a blank note without calling the server', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Amount'), '900')
    await user.click(screen.getByRole('button', { name: 'Add expense' }))

    expect(await screen.findByText('Describe what this payment was for.')).toBeInTheDocument()
    expect(fake.tables.expenses).toHaveLength(0)
  })

  it('rejects an EQUAL split with nobody selected', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Amount'), '900')
    for (const checkbox of screen.getAllByRole('checkbox')) {
      await user.click(checkbox)
    }
    await user.click(screen.getByRole('button', { name: 'Add expense' }))

    expect(await screen.findByText('Select at least one person to split with.')).toBeInTheDocument()
    expect(fake.tables.expenses).toHaveLength(0)
  })

  it('switches who paid via the payer tag row', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Amount'), '900')
    await user.type(screen.getByLabelText('Note'), 'Fuel')
    await user.click(screen.getByRole('button', { name: 'Mohan' }))
    await user.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() => expect(fake.tables.expenses).toHaveLength(1))
    expect(fake.tables.expenses[0].payer_id).toBe('m2')
  })

  it('tags an expense with a selected category', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Amount'), '900')
    await user.type(screen.getByLabelText('Note'), 'Fuel')
    await user.click(screen.getByRole('button', { name: 'Petrol' }))
    await user.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() => expect(fake.tables.expense_categories).toHaveLength(1))
    expect(fake.tables.expense_categories[0].category_id).toBe('c1')
  })

  it('calls onManageCategories from the trailing button', async () => {
    const user = userEvent.setup()
    const { onManageCategories } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Manage' }))

    expect(onManageCategories).toHaveBeenCalled()
  })

  it('gives the Manage button a visibly different style from the category tags', () => {
    renderForm()

    const manageButton = screen.getByRole('button', { name: 'Manage' })
    const categoryTag = screen.getByRole('button', { name: 'Petrol' })
    expect(manageButton.getAttribute('data-variant')).not.toBe(
      categoryTag.getAttribute('data-variant'),
    )
  })

  it('always sorts the "Other" category last, regardless of its position among the others', () => {
    renderForm(vi.fn(), [
      { id: 'c-other', spaceId: 'sp1', name: 'Other', position: 0, isActive: true },
      { id: 'c1', spaceId: 'sp1', name: 'Petrol', position: 1, isActive: true },
      { id: 'c2', spaceId: 'sp1', name: 'Egg', position: 2, isActive: true },
    ])

    const petrol = screen.getByRole('button', { name: 'Petrol' })
    const egg = screen.getByRole('button', { name: 'Egg' })
    const other = screen.getByRole('button', { name: 'Other' })

    // "Other" comes after both real categories in the DOM, even though
    // it was listed first in the input data.
    expect(petrol.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(egg.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('validates an EXACT split before allowing submission', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Amount'), '100')
    await user.type(screen.getByLabelText('Note'), 'Snacks')
    await user.click(screen.getByRole('button', { name: 'Exact' }))

    const amountInputs = screen.getAllByPlaceholderText('0.00')
    // First is the top-level amount field, the rest are per-member exact rows.
    await user.type(amountInputs[1], '50')
    await user.type(amountInputs[2], '30')

    expect(screen.getByText('Total: ₹80.00 of ₹100.00')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(
      await screen.findByText('Fix the split — amounts must add up to the total.'),
    ).toBeInTheDocument()
    expect(fake.tables.expenses).toHaveLength(0)

    await user.clear(amountInputs[2])
    await user.type(amountInputs[2], '50')
    expect(screen.getByText('Total: ₹100.00 of ₹100.00')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add expense' }))
    await waitFor(() => expect(fake.tables.expenses).toHaveLength(1))
    expect(fake.tables.expenses[0].split_type).toBe('EXACT')
    expect(fake.tables.expense_shares).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ member_id: 'm1', amount: 50 }),
        expect.objectContaining({ member_id: 'm2', amount: 50 }),
      ]),
    )
  })

  it('adds a CLAIM expense with a unit price and no participants', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Amount'), '700')
    await user.type(screen.getByLabelText('Note'), 'Eggs')
    await user.click(screen.getByRole('button', { name: 'Claim' }))
    await user.type(screen.getByPlaceholderText('e.g. 7.00 per egg'), '7')
    await user.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() => expect(fake.tables.expenses).toHaveLength(1))
    expect(fake.tables.expenses[0]).toMatchObject({ split_type: 'CLAIM', unit_price: 7 })
    expect(fake.tables.expense_participants).toHaveLength(0)
  })
})
