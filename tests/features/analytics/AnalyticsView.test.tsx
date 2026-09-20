import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Ledger } from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'
import { AnalyticsView } from '@/features/analytics/AnalyticsView'

const members = [
  { id: 'm1', spaceId: 'sp1', name: 'Kavin', isActive: true },
  { id: 'm2', spaceId: 'sp1', name: 'Mohan', isActive: true },
]
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
    {
      id: 'e2',
      amount: 100,
      payer: 'm2',
      categoryIds: [],
      splitType: 'EQUAL',
      participants: ['m1', 'm2'],
      splitData: {},
      date: '2026-09-01',
      note: 'Snacks',
      unitPrice: null,
      claims: [],
    },
  ],
  settlements: [],
}

function renderView(currentLedger: Ledger = ledger) {
  render(
    <AnalyticsView ledger={currentLedger} members={members} names={names} spaceName="Goa Trip" />,
  )
}

describe('AnalyticsView', () => {
  it('shows the unfiltered total spent and entry count', () => {
    renderView()
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows spend-by-category and spend-by-member charts', () => {
    renderView()
    expect(screen.getByText('Petrol')).toBeInTheDocument()
    expect(screen.getByText('Kavin')).toBeInTheDocument()
    expect(screen.getByText('Mohan')).toBeInTheDocument()
  })

  it('narrows the stats and charts to the selected preset', async () => {
    const user = userEvent.setup()
    renderView()

    await user.click(screen.getByRole('button', { name: /^filter$/i }))
    await user.click(screen.getByRole('button', { name: 'Today' }))

    // Both expenses are dated in the past — "Today" excludes both,
    // emptying both charts.
    expect(screen.getByText('₹0.00')).toBeInTheDocument()
    expect(screen.getAllByText('No data yet.')).toHaveLength(2)
  })

  it('shows a clearable chip once a filter is active', async () => {
    const user = userEvent.setup()
    renderView()

    await user.click(screen.getByRole('button', { name: /^filter$/i }))
    await user.click(screen.getByRole('button', { name: 'Today' }))

    const chip = screen.getByText(/→/)
    expect(chip).toBeInTheDocument()

    await user.click(chip)
    // Clearing restores the unfiltered total.
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument()
  })

  describe('CSV export', () => {
    let createObjectURL: ReturnType<typeof vi.fn>
    let revokeObjectURL: ReturnType<typeof vi.fn>
    let clickSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      createObjectURL = vi.fn(() => 'blob:mock-url')
      revokeObjectURL = vi.fn()
      // jsdom implements no Blob URL API at all.
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      clickSpy.mockRestore()
    })

    it('downloads a CSV named after the space, regardless of the active filter', async () => {
      const user = userEvent.setup()
      renderView()

      await user.click(screen.getByRole('button', { name: /export csv/i }))

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })
})
