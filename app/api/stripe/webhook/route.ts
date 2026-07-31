import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'

import { DEFAULT_PLAN_ID, isPlanId, type PlanId } from '@/lib/plans'
import { stripe, webhookSecret } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Stripe webhook: the only thing in the system allowed to change a plan.
 *
 * Four properties matter here, and each one is a bug that is painful to find
 * later:
 *
 *   1. The signature is verified. Without it, anyone who learns this URL can
 *      POST themselves onto the top tier.
 *   2. Events are idempotent. Stripe retries, and can deliver the same event
 *      more than once; a repeat must not apply an upgrade twice.
 *   3. The plan comes from the subscription's own status and price, not from
 *      which button the user clicked. The button is intent; this is fact.
 *   4. Recognised events always answer 200, even when we choose to ignore them,
 *      otherwise Stripe retries them forever.
 */

const RELEVANT_EVENTS = new Set<Stripe.Event.Type>([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  // The raw body, not the parsed one: signature verification is over the exact
  // bytes Stripe sent.
  const payload = await request.text()

  let event: Stripe.Event

  try {
    event = stripe().webhooks.constructEvent(payload, signature, webhookSecret())
  } catch (error) {
    console.error('[stripe] signature verification failed', error)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    // Acknowledged rather than rejected. Stripe sends plenty we do not care
    // about, and retrying them for days helps nobody.
    return NextResponse.json({ received: true })
  }

  const admin = createAdminClient()

  // Idempotency: the insert fails on a duplicate primary key, which is the
  // signal that this event was already handled.
  const { error: seenError } = await admin
    .from('stripe_events')
    .insert({ id: event.id, type: event.type })

  if (seenError) {
    if (seenError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true })
    }

    console.error('[stripe] could not record event', seenError)
    // A 500 asks Stripe to retry, which is right: we genuinely do not know
    // whether this was handled.
    return NextResponse.json({ error: 'Could not record event.' }, { status: 500 })
  }

  try {
    await handleEvent(event)
  } catch (error) {
    console.error('[stripe] handler failed', event.type, error)

    // Remove the marker so the retry is not swallowed as a duplicate.
    await admin.from('stripe_events').delete().eq('id', event.id)

    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object

      // Checkout completing does not mean the subscription is active yet, so
      // this only ensures the customer id is linked. The subscription events
      // carry the actual state.
      if (typeof session.customer === 'string') {
        const userId = session.metadata?.supabase_user_id
        if (userId) {
          await createAdminClient()
            .from('profiles')
            .update({ stripe_customer_id: session.customer })
            .eq('id', userId)
        }
      }

      return
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await applySubscription(event.data.object)
      return
    }
  }
}

/**
 * Writes the plan implied by a subscription's current state.
 *
 * `status` decides, not the event name: a subscription can be updated into a
 * past-due or cancelled state, and an event called "updated" that quietly left
 * someone on a paid tier they stopped paying for is exactly the bug this avoids.
 */
async function applySubscription(subscription: Stripe.Subscription) {
  const admin = createAdminClient()

  const userId = subscription.metadata?.supabase_user_id ?? null
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

  const grantsAccess = subscription.status === 'active' || subscription.status === 'trialing'

  const planId: PlanId = grantsAccess ? planFromSubscription(subscription) : DEFAULT_PLAN_ID

  const periodEnd = currentPeriodEnd(subscription)

  const update = {
    plan: planId,
    stripe_subscription_id: grantsAccess ? subscription.id : null,
    current_period_end: periodEnd,
  }

  // Prefer the id we put in metadata; fall back to the customer link for
  // subscriptions created outside our checkout, e.g. from the Stripe dashboard.
  if (userId) {
    await admin.from('profiles').update(update).eq('id', userId)
    return
  }

  await admin.from('profiles').update(update).eq('stripe_customer_id', customerId)
}

function planFromSubscription(subscription: Stripe.Subscription): PlanId {
  const fromMetadata = subscription.metadata?.plan_id

  if (isPlanId(fromMetadata)) return fromMetadata

  // Metadata missing means this subscription did not come from our checkout.
  // Degrading to free is the safe direction: an unrecognised paid subscription
  // is a billing question, while wrongly granting the top tier is a loss.
  console.warn('[stripe] subscription without a recognised plan', subscription.id)
  return DEFAULT_PLAN_ID
}

/**
 * Reads the end of the paid period.
 *
 * Lives on the subscription item in current API versions and on the
 * subscription itself in older ones, so both shapes are accepted rather than
 * pinning the code to whichever the account happens to be on.
 */
function currentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const fromItem = subscription.items?.data?.[0]?.current_period_end
  const fromSubscription = (subscription as unknown as { current_period_end?: number })
    .current_period_end

  const seconds = fromItem ?? fromSubscription

  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null
}
