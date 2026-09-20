/**
 * Typed, validated access to build-time environment variables.
 *
 * Vite replaces `import.meta.env.VITE_*` at build time. Reading them
 * through this module means a missing variable fails once, loudly, at
 * startup, instead of surfacing later as a confusing runtime error.
 *
 * Phase 3 note: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set to
 * placeholder values in .env for now — see PROJECT_STATE.md's Phase 3
 * section. They validate (present, non-empty strings) but do not point at
 * a real project, so anything that actually calls Supabase will fail at
 * the network layer, not here.
 */

function required(name: string): string {
  const value = import.meta.env[name]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env and fill it in.`,
    )
  }
  return value.trim()
}

export const env = Object.freeze({
  appName: required('VITE_APP_NAME'),
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  isProduction: import.meta.env.PROD,
})
