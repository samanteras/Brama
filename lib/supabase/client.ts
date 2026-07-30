import { createBrowserClient } from '@supabase/ssr'

import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

/**
 * Supabase client for browser components.
 *
 * Carries the publishable key and the signed-in user's session, so every query
 * it makes is subject to row level security. This is the only Supabase client
 * that may reach the browser.
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
