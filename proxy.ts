import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { publicEnv } from '@/lib/env'
import { frameAncestorsFor } from '@/lib/security/frame-ancestors'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Refreshes the Supabase session on every request and keeps signed-out users
 * out of the dashboard.
 *
 * This file is named `proxy` rather than `middleware` because Next 16 renamed
 * the convention. It runs on the Node.js runtime, which is not configurable.
 *
 * Refreshing here is not optional. Server components cannot write cookies, so
 * without this the rotated access token would never be persisted, and users
 * would be logged out at seemingly random moments.
 */
/** `/embed/<botId>`, with nothing after the id. */
const EMBED_PATH = /^\/embed\/([0-9a-fA-F-]{36})\/?$/

export async function proxy(request: NextRequest) {
  const embedMatch = request.nextUrl.pathname.match(EMBED_PATH)

  if (embedMatch) {
    return embedResponse(embedMatch[1])
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Written to the request first so anything rendering downstream in
          // this same pass sees the refreshed token, then to the response so
          // the browser keeps it.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }

          response = NextResponse.next({ request })

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // getUser(), not getSession(): only getUser() revalidates the token with the
  // auth server. getSession() trusts whatever the cookie claims, which a
  // visitor can edit.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && pathname.startsWith('/dashboard')) {
    const signIn = request.nextUrl.clone()
    signIn.pathname = '/sign-in'
    // So the user lands where they were headed after signing in.
    signIn.searchParams.set('next', pathname)
    return NextResponse.redirect(signIn)
  }

  if (user && (pathname === '/sign-in' || pathname === '/sign-up')) {
    const dashboard = request.nextUrl.clone()
    dashboard.pathname = '/dashboard'
    dashboard.search = ''
    return NextResponse.redirect(dashboard)
  }

  return response
}

/**
 * Locks the embed page to the bot's own domains.
 *
 * This runs here rather than in the page because a React Server Component
 * cannot set response headers, and the header has to be on the document itself
 * for the browser to act on it.
 *
 * It is the only part of the widget's defence a copied snippet cannot defeat:
 * every other check reads a value the caller supplies, while this one is
 * enforced by the visitor's browser before a request is ever made.
 */
async function embedResponse(botId: string): Promise<NextResponse> {
  const response = NextResponse.next()

  try {
    const admin = createAdminClient()

    const { data: bot } = await admin
      .from('bots')
      .select('allowed_domains')
      .eq('id', botId)
      .maybeSingle()

    if (bot) {
      response.headers.set('Content-Security-Policy', frameAncestorsFor(bot.allowed_domains))
    }
  } catch (error) {
    // Failing closed here would take the widget offline for every customer
    // during a database blip. The page itself still refuses to answer, since
    // the chat route repeats the domain check per message.
    console.error('[proxy] could not read bot for frame-ancestors', error)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *   - Next internals and static assets
     *   - /api/public, which serves anonymous widget visitors who have no
     *     session to refresh and must never be redirected to sign-in
     *   - /api/stripe, called by Stripe itself, which carries no session and
     *     whose webhook must see the request body untouched
     *   - widget.js, loaded from third-party sites
     *
     * /embed IS matched, but only to attach its frame-ancestors header; it
     * never reaches the session logic below.
     */
    '/((?!_next/static|_next/image|favicon.ico|widget.js|api/public|api/stripe|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
