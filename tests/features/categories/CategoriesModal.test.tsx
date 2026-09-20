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

const { CategoriesModal } = await import('@/features/categories/CategoriesModal')

beforeEach(() => {
  fake = createFakeSupabase({
    categories: [
      {
        id: 'c1',
        space_id: 'sp1',
        name: 'Petrol',
        position: 0,
        created_at: '2026-01-01',
        is_active: true,
      },
      {
        id: 'c2',
        space_id: 'sp1',
        name: 'Egg',
        position: 1,
        created_at: '2026-01-01',
        is_active: true,
      },
    ],
  })
})

function renderModal() {
  const { Wrapper } = createTestWrapper()
  const onOpenChange = vi.fn()
  render(
    <Wrapper>
      <CategoriesModal
        open
        onOpenChange={onOpenChange}
        spaceId="sp1"
        categories={[
          { id: 'c1', spaceId: 'sp1', name: 'Petrol', position: 0, isActive: true },
          { id: 'c2', spaceId: 'sp1', name: 'Egg', position: 1, isActive: true },
        ]}
      />
    </Wrapper>,
  )
  return { onOpenChange }
}

describe('CategoriesModal', () => {
  it('adds a category', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByPlaceholderText('Category name'), 'Groceries')
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() =>
      expect(fake.tables.categories.some((c) => c.name === 'Groceries')).toBe(true),
    )
  })

  it('rejects adding a duplicate name without calling the server', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByPlaceholderText('Category name'), 'Petrol')
    await user.click(screen.getByRole('button', { name: /add/i }))

    // Still only the two seeded categories — no third row added.
    expect(fake.tables.categories).toHaveLength(2)
  })

  it('renames a category inline', async () => {
    const user = userEvent.setup()
    renderModal()

    const row = screen.getByText('Petrol').closest('div')!
    const buttons = row.querySelectorAll('button')
    // [Move up, Move down, Pencil, Remove]
    await user.click(buttons[2])

    const input = screen.getByDisplayValue('Petrol')
    await user.clear(input)
    await user.type(input, 'Fuel{Enter}')

    await waitFor(() =>
      expect(fake.tables.categories.find((c) => c.id === 'c1')?.name).toBe('Fuel'),
    )
  })

  it('removes a category after confirming, as a soft delete', async () => {
    const user = userEvent.setup()
    renderModal()

    const row = screen.getByText('Egg').closest('div')!
    const buttons = row.querySelectorAll('button')
    await user.click(buttons[buttons.length - 1])

    await user.click(await screen.findByRole('button', { name: 'Remove' }))

    await waitFor(() =>
      expect(fake.tables.categories.find((c) => c.id === 'c2')?.is_active).toBe(false),
    )
  })

  it('moves a category down and persists the new order via set_category_order', async () => {
    const user = userEvent.setup()
    renderModal()

    const row = screen.getByText('Petrol').closest('div')!
    const moveDown = screen.getByRole('button', { name: 'Move Petrol down' })
    expect(row.contains(moveDown)).toBe(true)

    await user.click(moveDown)

    await waitFor(() =>
      expect(fake.rpcCalls).toEqual([
        { name: 'set_category_order', args: { p_space_id: 'sp1', p_category_ids: ['c2', 'c1'] } },
      ]),
    )
  })

  it('disables moving the first category up and the last category down', () => {
    renderModal()

    expect(screen.getByRole('button', { name: 'Move Petrol up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Egg down' })).toBeDisabled()
  })
})
