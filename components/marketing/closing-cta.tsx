import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { PLANS } from '@/lib/plans'

export function ClosingCta() {
  return (
    <section className="border-b bg-muted/30">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Somebody is reading your prices tonight
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground text-pretty">
          Upload one price list and ask your bot the question you get asked most. It takes about ten
          minutes to find out whether this is worth it.
        </p>

        <Button size="lg" className="mt-8" asChild>
          <Link href="/sign-up">Build your bot free</Link>
        </Button>

        <p className="mt-4 text-sm text-muted-foreground">
          No card required. {PLANS.free.limits.answersPerMonth} answers a month, and you keep the
          leads.
        </p>
      </div>
    </section>
  )
}
