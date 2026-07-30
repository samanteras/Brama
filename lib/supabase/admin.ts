import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { publicEnv } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'
import type { Database } from './database.types'

/**
 * Supabase client holding the service role key. **Bypasses row level security
 * entirely.**
 *
 * This exists for one reason: visitors talking to a widget on a customer's
 * website are anonymous. They have no account in our Supabase project and never
 * will, so there is no session for a policy to evaluate. Those requests are
 * served by routes that authorize explicitly — bot id, then Origin, then the
 * owner's remaining quota — before touching anything.
 *
 * Rules for using it:
 *
 *   - Never reach for it to work around an inconvenient policy. If the
 *     dashboard cannot read something, the policy is wrong; fix the policy.
 *   - Every query made with it must filter by the tenant the caller proved
 *     access to. There is no safety net underneath.
 *
 * Session persistence is off because there is no user to persist.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}
