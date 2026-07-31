import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { appUrl } from '@/lib/env'
import { isPlanId, resolveStripePriceId } from '@/lib/plans'
import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Starts a Stripe Checkout session for a plan.
 *
 * Notably does not change the plan. Nothing here writes to `profiles` — a user
 * who reached the checkout page has not paid yet, and treating the intent to
 * pay as payment is how accounts end up upgraded for free. The plan moves only
 * when the webhook says Stripe took the money.
 */

const bodySchema = z.object({
  planId: z.string().refine(isPlanId, { error: 'Unknown plan.' }),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 })
  }

  const planId = parsed.data.planId

  let priceId: string
  try {
    priceId = resolveStripePriceId(planId)
  } catch (error) {
    // A missing price id would otherwise send the user to a broken Stripe page,
    // which is far harder to diagnose than a loud failure here.
    console.error('[stripe] price id missing', error)
    return NextResponse.json({ error: 'Billing is not configured.' }, { status: 503 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  let customerId = profile?.stripe_customer_id ?? null

  if (!customerId) {
    const customer = await stripe().customers.create({
      email: user.email ?? undefined,
      // Carried so the webhook can find the account even if it arrives before
      // the checkout response does.
      metadata: { supabase_user_id: user.id },
    })

    customerId = customer.id

    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/dashboard/billing?checkout=success`,
    cancel_url: `${appUrl()}/dashboard/billing?checkout=cancelled`,
    // Repeated on the subscription so the webhook can map it back to a plan
    // without re-reading our own price ids.
    subscription_data: { metadata: { supabase_user_id: user.id, plan_id: planId } },
    metadata: { supabase_user_id: user.id, plan_id: planId },
  })

  if (!session.url) {
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 })
  }

  return NextResponse.json({ url: session.url })
}
