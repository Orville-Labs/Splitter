import type { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js'

/**
 * Every repository call funnels its `{ data, error }` result through here,
 * so callers can use ordinary try/catch instead of checking `error` by hand
 * at every call site.
 */
export class RepositoryError extends Error {
  operation: string
  cause: PostgrestError
  /** PostgREST error code, e.g. "42501" for permission denied. */
  code?: string

  constructor(operation: string, cause: PostgrestError) {
    super(`${operation} failed: ${cause.message}`)
    this.name = 'RepositoryError'
    this.operation = operation
    this.cause = cause
    this.code = cause.code
  }
}

/**
 * `result` is typed against Supabase's own `PostgrestSingleResponse<T>` —
 * a discriminated union on `error`/`data`, not a hand-rolled shape — so
 * this works identically for `.select()`, `.single()`, and `.rpc()` calls
 * without any cast. Narrowing on `result.error` discriminates the union
 * cleanly, since `error`/`data` are the actual discriminant fields.
 */
export function unwrap<T>(operation: string, result: PostgrestSingleResponse<T>): T {
  if (result.error) throw new RepositoryError(operation, result.error)
  return result.data
}
