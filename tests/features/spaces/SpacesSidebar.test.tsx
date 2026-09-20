import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeSupabase } from '../../helpers/fakeSupabase'
import { createTestWrapper } from '../../helpers/renderWithProviders'

let fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const { SpacesSidebar } = await import('@/features/spaces/SpacesSidebar')

const SPACES = [
  { id: 'sp1', ownerId: 'owner-1', name: 'My Group', position: 0 },
  { id: 'sp2', ownerId: 'owner-1', name: 'Goa Trip', position: 1 },
]

beforeEach(() => {
  fake = createFakeSupabase({
    spaces: SPACES.map((s) => ({
      id: s.id,
      owner_id: s.ownerId,
      name: s.name,
      position: s.position,
      created_at: '2026-01-01',
    })),
  })
  vi.clearAllMocks()
})

function renderSidebar(spaces = SPACES, activeSpaceId = 'sp1') {
  const { Wrapper } = createTestWrapper('owner-1')
  const onSwitch = vi.fn()
  const onCreated = vi.fn()
  render(
    <Wrapper>
      <SpacesSidebar
        open
        onOpenChange={vi.fn()}
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        onSwitch={onSwitch}
        onCreated={onCreated}
      />
    </Wrapper>,
  )
  return { onSwitch, onCreated }
}

describe('SpacesSidebar', () => {
  it('switches the active space on click', async () => {
    const user = userEvent.setup()
    const { onSwitch } = renderSidebar()

    await user.click(screen.getByRole('button', { name: /goa trip/i }))
    expect(onSwitch).toHaveBeenCalledWith('sp2')
  })

  it('creates a new space, seeded with default categories, and calls onCreated', async () => {
    const user = userEvent.setup()
    const { onSwitch, onCreated } = renderSidebar()

    await user.type(screen.getByPlaceholderText('e.g. Goa Trip'), 'Weekend Trip')
    await user.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => expect(fake.tables.spaces).toHaveLength(3))
    const created = fake.tables.spaces.find((s) => s.name === 'Weekend Trip')
    expect(created).toBeTruthy()
    expect(fake.tables.categories.filter((c) => c.space_id === created?.id)).toHaveLength(7)
    expect(onSwitch).toHaveBeenCalledWith(created?.id)
    expect(onCreated).toHaveBeenCalledWith(created?.id)
  })

  it('renames a space inline', async () => {
    const user = userEvent.setup()
    renderSidebar()

    const row = screen.getByText('My Group').closest('div')!
    // buttons[0] is the switch button (the row's whole name+check is a
    // <button>); the pencil (rename) is buttons[1].
    await user.click(row.querySelectorAll('button')[1])

    const input = screen.getByDisplayValue('My Group')
    await user.clear(input)
    await user.type(input, 'Renamed{Enter}')

    await waitFor(() =>
      expect(fake.tables.spaces.find((s) => s.id === 'sp1')?.name).toBe('Renamed'),
    )
  })

  it('deletes a non-active space after confirming', async () => {
    const user = userEvent.setup()
    renderSidebar()

    const row = screen.getByText('Goa Trip').closest('div')!
    const buttons = row.querySelectorAll('button')
    await user.click(buttons[buttons.length - 1])

    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(fake.tables.spaces).toHaveLength(1))
  })

  it('refuses to delete the last remaining space', async () => {
    const user = userEvent.setup()
    renderSidebar([SPACES[0]], 'sp1')

    const row = screen.getByText('My Group').closest('div')!
    const buttons = row.querySelectorAll('button')
    await user.click(buttons[buttons.length - 1])
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(toast.error).toHaveBeenCalledWith(
      'You need at least one space — create a new one before deleting this.',
    )
  })
})
