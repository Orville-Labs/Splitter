import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { Session, User } from '@supabase/supabase-js'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { SessionContext, type SessionContextValue } from '@/state/SessionContext'

function renderProtected(value: SessionContextValue) {
  return render(
    <SessionContext.Provider value={value}>
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/app" element={<ProtectedRoute />}>
            <Route index element={<div>Protected content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </SessionContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('shows a loading state while session status is unknown', () => {
    renderProtected({ session: null, user: null, status: 'loading' })
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('redirects to /login when signed out', () => {
    renderProtected({ session: null, user: null, status: 'signed-out' })
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders the protected content when signed in', () => {
    renderProtected({
      session: {} as unknown as Session,
      user: {} as unknown as User,
      status: 'signed-in',
    })
    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })
})
