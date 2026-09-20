import { createClient } from '@supabase/supabase-js'

import { env } from '@/config/env'
import type { Database } from '@/data/database.types'

/**
 * The single Supabase client for the app. Unlike the original app
 * (`persistSession: false` — no auth, so nothing to persist), this rebuild
 * has real sessions and needs them to survive a page reload.
 */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
