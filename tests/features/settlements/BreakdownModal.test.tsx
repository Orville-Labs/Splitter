import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Ledger } from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'
import { today } from '@/domain/dateRange'
import { BreakdownModal } from '@/features/settlements/BreakdownModal'

const names: NameLookup = { members: { m1: 'Kavin', m2: 'Mohan' }, categories: { c1: 'Petrol' } }

const ledger: Ledger = {
  members: ['m1', 'm2'],
  expenses: [
    {
      id: 'e1',
      amount: 900,
      payer: 'm1',
      categoryIds: ['c1'],
      splitType: 'EQUAL',
      participants: ['m1', 'm2'],
      splitData: {},
      date: '2020-01-01',
      note: 'Fuel',
      unitPrice: null,
      claims: [],
    },
  ],
  settlements: [{ id: 's1', from: 'm2', to: 'm1', amount: 200, date: '2020-01-02' }],
}

function renderModal(memberId: string | null, onOpenChange = vi.fn()) {
  render(
    <BreakdownModal
      open={memberId !== null}
      onOpenChange={onOpenChange}
      memberId={memberId}
      ledger={ledger}
      names={names}
    />,
  )
  return { onOpenChange }
}

describe('BreakdownModal', () => {
  it('renders nothing when no member is targeted', () => {
    const { container } = render(
      <BreakdownModal
        open={false}
        onOpenChange={vi.fn()}
        memberId={null}
        ledger={ledger}
        names={names}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the member's overall balance and status", () => {
    renderModal('m1')
    // Kavin paid 900 split with Mohan (450/450, so +450), then received
    // 200 back via the settlement (-200) — net +250.
    expect(screen.getByText('₹250.00')).toBeInTheDocument()
    expect(screen.getByText('Kavin gets back overall')).toBeInTheDocument()
  })

  it('lists both the expense and the settlement as breakdown rows', () => {
    renderModal('m1')
    expect(screen.getByText('Fuel')).toBeInTheDocument()
    expect(screen.getByText('Settlement')).toBeInTheDocument()
  })

  it('shows no net-change line for "All time"', () => {
    renderModal('m1')
    expect(screen.queryByText(/Net change in this range/)).not.toBeInTheDocument()
  })

  it('shows a net-change line and narrows the rows for a bounded preset', async () => {
    const user = userEvent.setup()
    renderModal('m1')

    await user.click(screen.getByRole('button', { name: 'Today' }))

    // The expense/settlement are both dated 2020, so "Today" excludes them.
    expect(screen.getByText('No entries in this range.')).toBeInTheDocument()
    expect(screen.getByText('Net change in this range: +₹0.00')).toBeInTheDocument()
  })

  it('reveals custom from/to fields for the Custom preset, defaulting "to" to today', async () => {
    const user = userEvent.setup()
    renderModal('m1')

    await user.click(screen.getByRole('button', { name: 'Custom' }))

    expect(screen.getByLabelText('From')).toHaveValue('')
    expect(screen.getByLabelText('To')).toHaveValue(today())
  })

  describe('grouped timeline', () => {
    it('groups rows under one day divider per calendar date', () => {
      renderModal('m1')
      expect(screen.getByText('Wednesday, 1 Jan 2020')).toBeInTheDocument()
      expect(screen.getByText('Thursday, 2 Jan 2020')).toBeInTheDocument()
    })

    it('no longer repeats the date inline in a row detail line', () => {
      renderModal('m1')
      // The date now lives solely in the day divider above it.
      expect(screen.queryByText(/2020-01-01/)).not.toBeInTheDocument()
      expect(screen.queryByText(/2020-01-02/)).not.toBeInTheDocument()
    })

    it('gives a balance-improving row and a balance-reducing row visibly different styling', () => {
      renderModal('m1')

      // Fuel: Kavin paid 900, split 450/450 -> +450, moved his balance in
      // his favour ("money in" in this app's balance-direction sense).
      const fuelAmount = screen.getByText('+₹450.00')
      expect(fuelAmount).toHaveClass('text-positive')

      // Settlement received: -200, moved his balance the other way (what
      // was owed to him just got partly paid down) — matches the exact
      // sign buildBreakdown/computeBalances already used before this
      // phase; this is a re-presentation, not a new math rule.
      const settlementAmount = screen.getByText('-₹200.00')
      expect(settlementAmount).toHaveClass('text-negative')
      expect(fuelAmount.className).not.toBe(settlementAmount.className)
    })
  })
})
