import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Lands the click from a confirmation email.
 *
 * The email links here, to our own app, rather than to Supabase's hosted
 * verify endpoint. Only a handler running on our domain can set the session
 * cookies, so verifying anywhere else would confirm the address but leave the
 * user signed out — landing them on the sign-in page with no explanation of
 * what just happened.
 */

/** The `type` values Supabase puts in email links we are prepared to verify. */
const EMAIL_OTP_TYPES = ['email', 'signup', 'email_change', 'recovery'] as const

type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number]

function isEmailOtpType(value: string): value is EmailOtpType {
  return (EMAIL_OTP_TYPES as readonly string[]).includes(value)
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type') ?? ''
  const code = request.nextUrl.searchParams.get('code')

  // Two link shapes land here. Supabase's stock email verifies on their side
  // and redirects back with `code`; our own template (once custom SMTP unlocks
  // template editing) links straight here with `token_hash`, which also works
  // when the email is opened in a different browser than the sign-up.
  if (tokenHash && isEmailOtpType(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

    if (!error) {
      return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin))
    }
  } else if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin))
    }
  }

  // Expired link, reused link, or a mangled URL. The sign-in page explains and
  // offers the way out (signing up again re-sends the email).
  const signIn = new URL('/sign-in', request.nextUrl.origin)
  signIn.searchParams.set('error', 'confirmation')
  return NextResponse.redirect(signIn)
}
