import Link from 'next/link'

import { Reveal } from '@/components/marketing/motion'
import { Button } from '@/components/ui/button'
import { PLANS } from '@/lib/plans'

/**
 * The final scene — dark again, closing the frame the hero opened.
 */
export function ClosingCta() {
  return (
    <section className="dark relative overflow-hidden border-b border-white/10 bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -bottom-72 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[160px]" />
      </div>

      <div className="relative mx-auto w-full max-w-4xl px-4 py-28 text-center sm:px-6 lg:py-36">
        <Reveal>
          <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Somebody is reading your prices tonight
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-8 max-w-xl text-lg text-muted-foreground text-pretty sm:text-xl">
            Upload one price list and ask your bot the question you get asked most. It takes about
            ten minutes to find out whether this is worth it.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <Button size="lg" className="mt-10 h-12 px-8 text-base" asChild>
            <Link href="/sign-up">Build your bot free</Link>
          </Button>

          <p className="mt-5 text-sm text-muted-foreground">
            No card required. {PLANS.free.limits.answersPerMonth} answers a month, and you keep the
            leads.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
