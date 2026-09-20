import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session, User } from '@supabase/supabase-js'
import type { ReactNode } from 'react'

import { ActiveSpaceProvider } from '@/state/ActiveSpaceProvider'
import { SessionContext } from '@/state/SessionContext'

/**
 * A QueryClient + fixed SessionContext + ActiveSpaceProvider wrapper, for
 * tests that render hooks/components depending on all three — every
 * query/component test in Phase 4 needs this combination.
 */
export function createTestWrapper(userId = 'user-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const user = { id: userId, email: `${userId}@example.com` } as unknown as User
  const session = { user } as unknown as Session

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <SessionContext.Provider value={{ session, user, status: 'signed-in' }}>
          <ActiveSpaceProvider>{children}</ActiveSpaceProvider>
        </SessionContext.Provider>
      </QueryClientProvider>
    )
  }

  return { Wrapper, queryClient, userId }
}
