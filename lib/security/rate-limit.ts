import 'server-only'

import { headers } from 'next/headers'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Shared rate limiting, backed by the same atomic counter that protects the
 * widget endpoint.
 *
 * Reused rather than reimplemented: a second mechanism would be a second thing
 * to get subtly wrong, and this one is already tested under concurrency.
 */

export type RateLimitVerdict = { allowed: boolean; hits: number }

/**
 * The caller's IP, as far as it can be known behind a proxy.
 *
 * Spoofable in principle, which is why this is only ever used to raise the cost
 * of bulk abuse, never as an authorization decision.
 */
export async function callerIp(): Promise<string> {
  const headerList = await headers()

  return (
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerList.get('x-real-ip') ??
    'unknown'
  )
}

export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitVerdict> {
  const { data, error } = await createAdminClient().rpc('check_rate_limit', {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    // Failing open is the deliberate choice for a limiter. A database hiccup
    // should not stop legitimate people from signing in; the limits exist to
    // raise the cost of bulk abuse, not to gate correctness.
    console.error('[rate-limit] check failed', error)
    return { allowed: true, hits: 0 }
  }

  const row = data?.[0]
  return { allowed: row?.allowed ?? true, hits: row?.hits ?? 0 }
}
