import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { createFakeSupabase } from '../helpers/fakeSupabase'
import { createTestWrapper } from '../helpers/renderWithProviders'

const fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

vi.mock('@/data/spaces.repository', () => ({
  listSpaces: () => Promise.reject(new Error('network down')),
  createSpace: vi.fn(),
}))

const { AppShell } = await import('@/routes/AppShell')

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

describe('AppShell (spaces query failure)', () => {
  it('shows a real error state with a way to recover, instead of loading forever', async () => {
    renderShell()

    await waitFor(() =>
      expect(screen.getByText('Something went wrong loading your spaces.')).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(screen.queryByText('Setting up your space…')).not.toBeInTheDocument()
  })
})
