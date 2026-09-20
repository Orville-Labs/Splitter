import { Navigate, Outlet } from 'react-router-dom'

import { useSession } from '@/state/SessionContext'

/** Gates every /app/* route on a signed-in session. */
export function ProtectedRoute() {
  const { status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  if (status === 'signed-out') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
