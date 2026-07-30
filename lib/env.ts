/**
 * Environment variables that are safe in the browser.
 *
 * Only `NEXT_PUBLIC_`-prefixed values belong here. Server secrets live in
 * `env.server.ts`, which is guarded by `server-only` so importing it from a
 * client component fails the build rather than shipping a key to the browser.
 *
 * Values are read through explicit property access rather than a loop, because
 * Next inlines `process.env.NEXT_PUBLIC_*` at build time only when it can see
 * the full property name in the source.
 */

import { z } from 'zod'

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: 'NEXT_PUBLIC_SUPABASE_URL must be the full project URL, e.g. https://abc.supabase.co',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, { error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required' }),
  NEXT_PUBLIC_APP_URL: z.url({
    error: 'NEXT_PUBLIC_APP_URL must be a full URL, e.g. http://localhost:3000',
  }),
})

/**
 * Parsed once at module load, so a missing variable fails immediately and by
 * name instead of surfacing later as a confusing runtime error deep inside the
 * Supabase client.
 */
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
})

/** Base URL used to build the embed snippet shown to customers. */
export function appUrl(): string {
  return publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
}
