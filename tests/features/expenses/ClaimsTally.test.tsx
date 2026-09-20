import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Claim } from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'
import { createFakeSupabase } from '../../helpers/fakeSupabase'
import { createTestWrapper } from '../../helpers/renderWithProviders'

let fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { ClaimsTally } = await import('@/features/expenses/ClaimsTally')

const names: NameLookup = { members: { m1: 'Kavin', m2: 'Mohan' }, categories: {} }

const claims: Claim[] = [
  { id: 'c1', member: 'm1', amount: 100, qty: null, date: '2026-09-01' },
  { id: 'c2', member: 'm2', amount: 200, qty: null, date: '2026-09-02' },
]

beforeEach(() => {
  fake = createFakeSupabase({
    claims: [
      {
        id: 'c1',
        expense_id: 'e1',
        member_id: 'm1',
        amount: 100,
        qty: null,
        claim_date: '2026-09-01',
      },
      {
        id: 'c2',
        expense_id: 'e1',
        member_id: 'm2',
        amount: 200,
        qty: null,
        claim_date: '2026-09-02',
      },
    ],
  })
})

function renderTally(props: Partial<Parameters<typeof ClaimsTally>[0]> = {}) {
  const { Wrapper } = createTestWrapper()
  render(
    <Wrapper>
      <ClaimsTally claims={claims} unitPrice={null} names={names} {...props} />
    </Wrapper>,
  )
}

describe('ClaimsTally', () => {
  it('shows the empty text with no claims', () => {
    renderTally({ claims: [], emptyText: 'Nothing yet.' })
    expect(screen.getByText('Nothing yet.')).toBeInTheDocument()
  })

  it('resolves claimant ids to display names', () => {
    renderTally()
    expect(screen.getByText('Kavin')).toBeInTheDocument()
    expect(screen.getByText('Mohan')).toBeInTheDocument()
  })

  it('shows most recent first', () => {
    renderTally()
    const rows = screen.getAllByText(/Kavin|Mohan/)
    expect(rows[0]).toHaveTextContent('Mohan')
    expect(rows[1]).toHaveTextContent('Kavin')
  })

  it('shows quantity × unit price when the expense has one', () => {
    renderTally({
      claims: [{ id: 'c1', member: 'm1', amount: 70, qty: 10, date: '2026-09-01' }],
      unitPrice: 7,
    })
    expect(screen.getByText('Kavin · 10 × ₹7.00')).toBeInTheDocument()
  })

  it('falls back to the raw id when a claimant has no name (e.g. removed member)', () => {
    renderTally({
      claims: [{ id: 'c1', member: 'unknown-id', amount: 50, qty: null, date: '2026-09-01' }],
    })
    expect(screen.getByText('unknown-id')).toBeInTheDocument()
  })

  it('deletes a claim when its remove button is clicked', async () => {
    const user = userEvent.setup()
    renderTally()

    await user.click(screen.getByRole('button', { name: 'Remove claim from Kavin' }))

    await waitFor(() => expect(fake.tables.claims).toHaveLength(1))
    expect(fake.tables.claims[0].member_id).toBe('m2')
  })
})
