import { useEffect, useState, type ReactNode } from 'react'

import { supabase } from '@/lib/supabaseClient'

import { SessionContext, type SessionStatus } from './SessionContext'
import type { Session } from '@supabase/supabase-js'

/**
 * The one piece of state genuinely cross-cutting enough to warrant a
 * Context (see ROADMAP.md's stack decisions) — nearly every route and
 * query needs to know who's signed in, or whether anyone is yet.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<SessionStatus>('loading')

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setStatus(data.session ? 'signed-in' : 'signed-out')
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setStatus(nextSession ? 'signed-in' : 'signed-out')
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <SessionContext.Provider value={{ session, user: session?.user ?? null, status }}>
      {children}
    </SessionContext.Provider>
  )
}
