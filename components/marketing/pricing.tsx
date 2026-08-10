import Link from 'next/link'
import { Check } from 'lucide-react'

import { Reveal, Stagger, StaggerItem } from '@/components/marketing/motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FEATURED_PLAN_ID, formatPrice, PLAN_TAGLINES, planHighlights } from '@/lib/plan-copy'
import { PLAN_LIST } from '@/lib/plans'

/**
 * Pricing cards, rendered entirely from `lib/plans.ts`.
 *
 * Nothing here restates a number. Change a limit in one place and this section,
 * the dashboard, and the server-side check all move together.
 */
export function Pricing() {
  return (
    <section id="pricing" className="border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <Reveal className="max-w-3xl">
          <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Priced against one job, not per seat
          </h2>
          <p className="mt-6 text-lg text-muted-foreground text-pretty sm:text-xl">
            Start free and keep the leads it collects. Upgrade when the volume says you should.
          </p>
        </Reveal>

        <Stagger className="mt-16 grid gap-6 lg:grid-cols-3" delay={0.15}>
          {PLAN_LIST.map((plan) => {
            const isFeatured = plan.id === FEATURED_PLAN_ID

            return (
              <StaggerItem key={plan.id} className="flex">
                <Card
                  className={cn(
                    'flex w-full flex-col p-7',
                    isFeatured &&
                      'border-primary shadow-xl shadow-primary/15 lg:-translate-y-2 lg:scale-[1.02]',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {isFeatured ? <Badge>Most chosen</Badge> : null}
                  </div>

                  <p className="mt-2 min-h-10 text-sm text-muted-foreground text-pretty">
                    {PLAN_TAGLINES[plan.id]}
                  </p>

                  <p className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-5xl font-semibold tracking-tight">
                      {formatPrice(plan.monthlyPriceCents)}
                    </span>
                    {plan.monthlyPriceCents > 0 ? (
                      <span className="text-sm text-muted-foreground">/month</span>
                    ) : null}
                  </p>

                  <ul className="mt-6 flex-1 space-y-3 text-sm">
                    {planHighlights(plan).map((highlight) => (
                      <li key={highlight} className="flex gap-2.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        <span className="text-muted-foreground">{highlight}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-8"
                    variant={isFeatured ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/sign-up">
                      {plan.monthlyPriceCents === 0 ? 'Start free' : `Choose ${plan.name}`}
                    </Link>
                  </Button>
                </Card>
              </StaggerItem>
            )
          })}
        </Stagger>

        <Reveal delay={0.1}>
          <p className="mt-10 text-sm text-muted-foreground">
            An answer is one reply from your bot, whether it came from the widget or from you
            testing it. Leads are never counted or capped as a separate charge.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
