import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

/**
 * Supabase client for server components, server actions and route handlers.
 *
 * Acts as the signed-in user: it carries their session and is subject to row
 * level security, so a policy bug shows up here as missing data rather than as
 * a silent cross-tenant leak.
 *
 * A fresh client per request is mandatory — sharing one across requests would
 * mean serving one user's session to another.
 */
export async function createClient() {
  // Asynchronous in Next 16; the synchronous form was removed.
  const cookieStore = await cookies()

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server components cannot set cookies. That is expected and
            // harmless here: proxy.ts refreshes the session on every request,
            // so the write this call wanted to make has already happened.
          }
        },
      },
    },
  )
}
