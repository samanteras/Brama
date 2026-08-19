import { NextResponse } from 'next/server'

import { appUrl } from '@/lib/env'
import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Opens Stripe's own billing portal.
 *
 * Cancelling, changing card, downloading invoices — all of it is Stripe's
 * problem, and rebuilding any of it here would mean handling payment details we
 * have deliberately never touched.
 */
export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Вы не вошли в аккаунт.' }, { status: 401 })
  }

  const { data: profile } = await createAdminClient()
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'Платёжного аккаунта ещё нет.' }, { status: 400 })
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl()}/dashboard/billing`,
  })

  return NextResponse.json({ url: session.url })
}
