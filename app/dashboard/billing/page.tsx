import type { Metadata } from 'next'
import { Check } from 'lucide-react'

import { ManageBillingButton, UpgradeButton } from './plan-actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatPrice, PLAN_TAGLINES, planHighlights } from '@/lib/plan-copy'
import { getPlan, PLAN_LIST, toPlanId } from '@/lib/plans'
import { isBillingConfigured } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Billing',
}

export default async function BillingPage(props: PageProps<'/dashboard/billing'>) {
  const { checkout } = await props.searchParams
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, stripe_customer_id, current_period_end')
    .maybeSingle()

  const currentPlan = getPlan(toPlanId(profile?.plan))
  const billingReady = isBillingConfigured()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-muted-foreground">
          You are on the {currentPlan.name} plan.
          {profile?.current_period_end
            ? ` Renews ${new Date(profile.current_period_end).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}.`
            : ''}
        </p>
      </div>

      {checkout === 'success' ? (
        <Alert>
          <AlertDescription>
            Payment received. Your plan updates as soon as Stripe confirms it — usually within a few
            seconds. Refresh if it still shows the old one.
          </AlertDescription>
        </Alert>
      ) : null}

      {checkout === 'cancelled' ? (
        <Alert>
          <AlertDescription>Checkout cancelled. Nothing was charged.</AlertDescription>
        </Alert>
      ) : null}

      {!billingReady ? (
        <Alert variant="destructive">
          <AlertDescription>
            Stripe is not configured on this deployment, so upgrading is unavailable. Plans and
            limits below are still enforced.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {PLAN_LIST.map((plan) => {
          const isCurrent = plan.id === currentPlan.id
          const isFree = plan.monthlyPriceCents === 0

          return (
            <Card key={plan.id} className={isCurrent ? 'border-primary p-6' : 'p-6'}>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                {isCurrent ? <Badge>Current</Badge> : null}
              </div>

              <p className="mt-2 min-h-10 text-sm text-muted-foreground text-pretty">
                {PLAN_TAGLINES[plan.id]}
              </p>

              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight">
                  {formatPrice(plan.monthlyPriceCents)}
                </span>
                {plan.monthlyPriceCents > 0 ? (
                  <span className="text-sm text-muted-foreground">/month</span>
                ) : null}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {planHighlights(plan).map((highlight) => (
                  <li key={highlight} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-muted-foreground">{highlight}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <p className="text-center text-sm text-muted-foreground">Your current plan</p>
                ) : isFree ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Downgrade from the billing portal
                  </p>
                ) : (
                  <UpgradeButton
                    planId={plan.id}
                    label={`Switch to ${plan.name}`}
                    variant={plan.monthlyPriceCents > currentPlan.monthlyPriceCents ? 'default' : 'outline'}
                    disabled={!billingReady}
                  />
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {profile?.stripe_customer_id ? (
        <Card className="p-6">
          <h2 className="font-semibold">Payment details and invoices</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground text-pretty">
            Card, invoices and cancellation are handled by Stripe. We never see or store your card
            details.
          </p>
          <ManageBillingButton />
        </Card>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Test mode: use card <code className="text-xs">4242 4242 4242 4242</code> with any future
        expiry and any CVC.
      </p>
    </div>
  )
}
