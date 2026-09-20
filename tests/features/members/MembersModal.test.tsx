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

const { MembersModal } = await import('@/features/members/MembersModal')

beforeEach(() => {
  fake = createFakeSupabase({
    members: [
      { id: 'm1', space_id: 'sp1', name: 'Kavin', created_at: '2026-01-01', is_active: true },
      { id: 'm2', space_id: 'sp1', name: 'Kishore', created_at: '2026-01-01', is_active: true },
    ],
  })
})

function renderModal() {
  const { Wrapper } = createTestWrapper()
  const onOpenChange = vi.fn()
  render(
    <Wrapper>
      <MembersModal
        open
        onOpenChange={onOpenChange}
        spaceId="sp1"
        members={[
          { id: 'm1', spaceId: 'sp1', name: 'Kavin', isActive: true },
          { id: 'm2', spaceId: 'sp1', name: 'Kishore', isActive: true },
        ]}
      />
    </Wrapper>,
  )
  return { onOpenChange }
}

describe('MembersModal', () => {
  it('adds a member', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByPlaceholderText('Member name'), 'Mohan')
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => expect(fake.tables.members.some((m) => m.name === 'Mohan')).toBe(true))
  })

  it('rejects adding a duplicate name without calling the server', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByPlaceholderText('Member name'), 'Kavin')
    await user.click(screen.getByRole('button', { name: /add/i }))

    // Still only the two seeded members — no third row added.
    expect(fake.tables.members).toHaveLength(2)
  })

  it('renames a member inline', async () => {
    const user = userEvent.setup()
    renderModal()

    const row = screen.getByText('Kavin').closest('div')!
    await user.click(row.querySelector('button')!)

    const input = screen.getByDisplayValue('Kavin')
    await user.clear(input)
    await user.type(input, 'Kavin R{Enter}')

    await waitFor(() =>
      expect(fake.tables.members.find((m) => m.id === 'm1')?.name).toBe('Kavin R'),
    )
  })

  it('removes a member after confirming, as a soft delete', async () => {
    const user = userEvent.setup()
    renderModal()

    const row = screen.getByText('Kishore').closest('div')!
    const buttons = row.querySelectorAll('button')
    await user.click(buttons[buttons.length - 1])

    await user.click(await screen.findByRole('button', { name: 'Remove' }))

    await waitFor(() =>
      expect(fake.tables.members.find((m) => m.id === 'm2')?.is_active).toBe(false),
    )
  })
})
