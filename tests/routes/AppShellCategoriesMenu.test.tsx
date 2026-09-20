import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeSupabase } from '../helpers/fakeSupabase'
import { createTestWrapper } from '../helpers/renderWithProviders'

let fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { AppShell } = await import('@/routes/AppShell')

beforeEach(() => {
  localStorage.clear()
  fake = createFakeSupabase({
    spaces: [
      { id: 'sp1', owner_id: 'user-1', name: 'My Group', position: 0, created_at: '2026-01-01' },
    ],
    members: [
      { id: 'm1', space_id: 'sp1', name: 'Kavin', created_at: '2026-01-01', is_active: true },
    ],
    categories: [
      {
        id: 'c1',
        space_id: 'sp1',
        name: 'Petrol',
        position: 0,
        created_at: '2026-01-01',
        is_active: true,
      },
    ],
    expenses: [],
    settlements: [],
  })
})

/**
 * Kept in its own file — see the comment above the "Group members"
 * dropdown test in AppShell.test.tsx for why. Both tests open the same
 * header DropdownMenuTrigger; a second real open of it within one test
 * file was confirmed to fail even with nothing else happening in
 * between, so each such test gets its own file instead.
 */
describe('AppShell header dropdown — Categories', () => {
  it('lets the header menu open the categories modal for the active space', async () => {
    const user = userEvent.setup({ skipHover: true })
    const { Wrapper } = createTestWrapper('user-1')
    render(
      <Wrapper>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </Wrapper>,
    )
    await waitFor(() => expect(screen.getByText('My Group')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(await screen.findByText('Categories'))

    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('Petrol')).toBeInTheDocument()
  })
})
