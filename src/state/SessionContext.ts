import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type SessionStatus = 'loading' | 'signed-in' | 'signed-out'

export interface SessionContextValue {
  session: Session | null
  user: User | null
  status: SessionStatus
}

/**
 * Exported (not just the hook) so tests can render a subtree with a fixed
 * session value via `<SessionContext.Provider value={...}>`, instead of
 * mocking `@/lib/supabaseClient`'s auth calls for every test that merely
 * needs to assume "signed in" or "signed out".
 */
export const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used within a SessionProvider')
  return value
}
