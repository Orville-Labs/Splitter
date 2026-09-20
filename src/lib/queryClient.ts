import { QueryClient } from '@tanstack/react-query'

/**
 * One QueryClient for the app. Every table's data is loaded once and kept
 * around (staleTime: Infinity) so switching spaces is a pure in-memory
 * recompute, not a refetch — see ROADMAP.md's "Redesigned data model" and
 * the target-architecture notes carried over from the migration plan.
 * Mutations invalidate explicitly; nothing here silently refetches on
 * window focus.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
