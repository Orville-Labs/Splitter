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
  // ActiveSpaceProvider reads real localStorage on mount — without
  // clearing it, a space switch from an earlier test in this file
  // leaks into the next one (and can coincidentally still "resolve" if
  // the stale id happens to match a space id reused across tests).
  localStorage.clear()
  fake = createFakeSupabase({
    spaces: [
      { id: 'sp1', owner_id: 'user-1', name: 'My Group', position: 0, created_at: '2026-01-01' },
      { id: 'sp2', owner_id: 'user-1', name: 'Goa Trip', position: 1, created_at: '2026-01-02' },
    ],
    members: [
      { id: 'm1', space_id: 'sp1', name: 'Kavin', created_at: '2026-01-01', is_active: true },
    ],
    categories: [],
    expenses: [],
    settlements: [],
  })
})

function renderShell() {
  const { Wrapper } = createTestWrapper('user-1')
  return render(
    <Wrapper>
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    </Wrapper>,
  )
}

describe('AppShell', () => {
  it('shows the active space name in the header once loaded', async () => {
    renderShell()
    await waitFor(() => expect(screen.getByText('My Group')).toBeInTheDocument())
  })

  /**
   * userEvent.click()'s default hover-simulation step (moving a virtual
   * pointer across the DOM before the click) never resolves against this
   * particular DropdownMenuTrigger — confirmed via a diagnostic onClick
   * that the click *does* reach the button, and that skipping the hover
   * step (or using user.pointer() directly) opens the menu every time.
   * skipHover sidesteps it without changing what's actually being
   * asserted.
   *
   * This is deliberately the ONLY test in this file that opens this
   * dropdown. Confirmed (Phase 6) that a *second* real open of the same
   * DropdownMenuTrigger within one test file fails even in a completely
   * fresh render with nothing else happening in between (isolated it
   * down to two back-to-back "click trigger, assert item text" tests,
   * no Dialog/Sheet involved at all) — some Radix-internal module-level
   * state isn't reset between tests in the same file under this
   * project's `pool: 'vmThreads'` setup, only between separate files.
   * Rather than chase that further, every other test needing this same
   * dropdown lives in its own file — see AppShellCategoriesMenu.test.tsx.
   */
  it('lets the header menu open the members modal for the active space', async () => {
    const user = userEvent.setup({ skipHover: true })
    renderShell()
    await waitFor(() => expect(screen.getByText('My Group')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(await screen.findByText('Group members'))

    // "Kavin" also appears in the always-mounted (but `hidden`) Settlement
    // panel — findByText doesn't filter on `hidden` the way getByRole
    // does, so scope the assertion to the dialog that just opened.
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('Kavin')).toBeInTheDocument()
  })

  it('keeps every tab panel mounted, only toggling visibility (never unmounts on switch)', async () => {
    const user = userEvent.setup()
    renderShell()
    await waitFor(() => expect(screen.getByText('My Group')).toBeInTheDocument())

    // `hidden: true` here means "include elements outside the
    // accessibility tree when querying" (RTL's option), not "only find
    // hidden ones" — needed to grab a stable reference to the
    // Settlement panel's heading before it's ever shown, so it can be
    // checked both hidden and visible. A plain getByRole would fail on
    // the hidden one: the `hidden` attribute removes it from the a11y
    // tree entirely, which is the correct, intentional behavior being
    // tested. "Balances" is SettlementsView's first card (Phase 8) —
    // any of its three card headings would do equally well here.
    const addPanelHeading = screen.getByRole('heading', { name: 'Add expense', hidden: true })
    const settlePanelHeading = screen.getByRole('heading', { name: 'Balances', hidden: true })
    expect(addPanelHeading).toBeVisible()
    expect(settlePanelHeading).not.toBeVisible()

    await user.click(screen.getByRole('button', { name: /settlement/i }))

    expect(settlePanelHeading).toBeVisible()
    expect(addPanelHeading).not.toBeVisible()
    // Still in the DOM, not unmounted — a future phase's form draft would
    // survive this switch for the same reason.
    expect(addPanelHeading).toBeInTheDocument()
  })

  it('opens the spaces sidebar and switches the active space', async () => {
    const user = userEvent.setup()
    renderShell()
    await waitFor(() => expect(screen.getByText('My Group')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /spaces/i }))
    await user.click(screen.getByRole('button', { name: 'Goa Trip' }))

    await waitFor(() => expect(screen.getByText('Goa Trip')).toBeInTheDocument())
  })

  it('opens the members modal automatically right after creating a new space', async () => {
    const user = userEvent.setup()
    renderShell()
    await waitFor(() => expect(screen.getByText('My Group')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /spaces/i }))
    await user.type(screen.getByPlaceholderText('e.g. Goa Trip'), 'Weekend Trip')
    await user.click(screen.getByRole('button', { name: /create/i }))

    // A brand-new space has no members yet — the create flow should
    // switch to it AND immediately open the members modal, exactly like
    // the original app's create() -> openMembersModal().
    await waitFor(() => expect(screen.getByText('Group members')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument())
  })
})
