/**
 * Query keys, centralised so a typo surfaces as an import error rather
 * than a cache miss. Every key is unscoped by space — see
 * lib/queryClient.ts and useLedger.ts for why (load everything once,
 * group client-side, switch spaces without refetching).
 */
export const queryKeys = {
  spaces: ['spaces'] as const,
  members: ['members'] as const,
  categories: ['categories'] as const,
  expenses: ['expenses'] as const,
  settlements: ['settlements'] as const,
}
