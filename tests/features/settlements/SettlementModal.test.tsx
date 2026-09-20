import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Settlement } from '@/domain/balances'
import { createFakeSupabase } from '../../helpers/fakeSupabase'
import { createTestWrapper } from '../../helpers/renderWithProviders'

let fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { SettlementModal } = await import('@/features/settlements/SettlementModal')

const members = [
  { id: 'm1', spaceId: 'sp1', name: 'Kavin', isActive: true },
  { id: 'm2', spaceId: 'sp1', name: 'Mohan', isActive: true },
  { id: 'm3', spaceId: 'sp1', name: 'Kishore', isActive: true },
]

beforeEach(() => {
  fake = createFakeSupabase()
})

function renderModal(settlement: Settlement | null, onOpenChange = vi.fn()) {
  const { Wrapper } = createTestWrapper()
  render(
    <Wrapper>
      <SettlementModal
        open
        onOpenChange={onOpenChange}
        spaceId="sp1"
        members={members}
        settlement={settlement}
      />
    </Wrapper>,
  )
  return { onOpenChange }
}

describe('SettlementModal', () => {
  it('records a new settlement between the first two members by default', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderModal(null)

    await user.type(screen.getByLabelText('Amount'), '100')
    await user.click(screen.getByRole('button', { name: 'Record settlement' }))

    await waitFor(() => expect(fake.tables.settlements).toHaveLength(1))
    expect(fake.tables.settlements[0]).toMatchObject({
      space_id: 'sp1',
      from_member_id: 'm1',
      to_member_id: 'm2',
      amount: 100,
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("switches 'to' automatically when 'from' collides with it", async () => {
    const user = userEvent.setup()
    renderModal(null)

    // Default from=Kavin, to=Mohan. Picking Mohan as "from" must bump
    // "to" off Mohan onto someone else, never leaving both the same.
    // "Mohan" appears in both tag rows, so scope to the "From" one.
    const fromRow = screen.getByText('From').parentElement!
    await user.click(within(fromRow).getByRole('button', { name: 'Mohan' }))
    await user.type(screen.getByLabelText('Amount'), '50')
    await user.click(screen.getByRole('button', { name: 'Record settlement' }))

    await waitFor(() => expect(fake.tables.settlements).toHaveLength(1))
    expect(fake.tables.settlements[0].from_member_id).toBe('m2')
    expect(fake.tables.settlements[0].to_member_id).not.toBe('m2')
  })

  it('never offers the current "from" as a "to" option', () => {
    renderModal(null)
    // Kavin is "from" by default — must not also appear in the "to" row.
    // Its "from" pill still exists, so scope the assertion to just the
    // "to" tag row's buttons via the one following the "To" label.
    const toLabel = screen.getByText('To')
    const toRow = toLabel.parentElement!
    expect(within(toRow).queryByRole('button', { name: 'Kavin' })).not.toBeInTheDocument()
  })

  it('rejects a non-positive amount', async () => {
    const user = userEvent.setup()
    renderModal(null)

    await user.click(screen.getByRole('button', { name: 'Record settlement' }))

    expect(fake.tables.settlements).toHaveLength(0)
  })

  it('prefills from an existing settlement and saves an edit', async () => {
    const user = userEvent.setup()
    fake.tables.settlements.push({
      id: 's1',
      space_id: 'sp1',
      from_member_id: 'm2',
      to_member_id: 'm3',
      amount: 40,
      settlement_date: '2026-09-02',
      created_at: '2026-09-02',
    })
    const settlement: Settlement = {
      id: 's1',
      from: 'm2',
      to: 'm3',
      amount: 40,
      date: '2026-09-02',
    }
    const { onOpenChange } = renderModal(settlement)

    expect(screen.getByLabelText('Amount')).toHaveValue(40)

    await user.clear(screen.getByLabelText('Amount'))
    await user.type(screen.getByLabelText('Amount'), '60')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(fake.tables.settlements[0].amount).toBe(60))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('deletes an existing settlement after confirming', async () => {
    const user = userEvent.setup()
    fake.tables.settlements.push({
      id: 's1',
      space_id: 'sp1',
      from_member_id: 'm2',
      to_member_id: 'm3',
      amount: 40,
      settlement_date: '2026-09-02',
      created_at: '2026-09-02',
    })
    const settlement: Settlement = {
      id: 's1',
      from: 'm2',
      to: 'm3',
      amount: 40,
      date: '2026-09-02',
    }
    const { onOpenChange } = renderModal(settlement)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete', exact: true }))

    await waitFor(() => expect(fake.tables.settlements).toHaveLength(0))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
