import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type AuthChangeCallback = (event: string, session: { user: { email: string } } | null) => void
const listeners: AuthChangeCallback[] = []

const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn((callback: AuthChangeCallback) => {
      listeners.push(callback)
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }),
  },
}

vi.mock('@/lib/supabaseClient', () => ({ supabase: mockSupabase }))

const { SessionProvider } = await import('@/state/SessionProvider')
const { useSession } = await import('@/state/SessionContext')

function Probe() {
  const { status, user } = useSession()
  return <div>{`${status}:${user?.email ?? 'none'}`}</div>
}

beforeEach(() => {
  listeners.length = 0
  mockSupabase.auth.getSession.mockReset()
})

describe('SessionProvider', () => {
  it('reflects no session once getSession resolves', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(screen.getByText('signed-out:none')).toBeInTheDocument())
  })

  it('reflects an existing session on mount', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { email: 'kavin@example.com' } } },
    })
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(screen.getByText('signed-in:kavin@example.com')).toBeInTheDocument())
  })

  it('updates when onAuthStateChange fires (e.g. after sign-in or sign-out elsewhere)', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(screen.getByText('signed-out:none')).toBeInTheDocument())

    listeners.forEach((callback) => callback('SIGNED_IN', { user: { email: 'new@example.com' } }))
    await waitFor(() => expect(screen.getByText('signed-in:new@example.com')).toBeInTheDocument())

    listeners.forEach((callback) => callback('SIGNED_OUT', null))
    await waitFor(() => expect(screen.getByText('signed-out:none')).toBeInTheDocument())
  })
})
