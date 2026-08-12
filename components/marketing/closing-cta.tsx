import Link from 'next/link'

import type { MarketingCopy } from '@/components/marketing/copy'
import { Reveal } from '@/components/marketing/motion'
import { Button } from '@/components/ui/button'

/**
 * The final scene — dark again, closing the frame the hero opened.
 */
export function ClosingCta({ copy }: { copy: MarketingCopy['closing'] }) {
  return (
    <section className="dark relative overflow-hidden border-b border-white/10 bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -bottom-72 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[160px]" />
      </div>

      <div className="relative mx-auto w-full max-w-4xl px-4 py-28 text-center sm:px-6 lg:py-36">
        <Reveal>
          <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {copy.title}
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-8 max-w-xl text-lg text-muted-foreground text-pretty sm:text-xl">
            {copy.sub}
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <Button size="lg" className="mt-10 h-12 px-8 text-base" asChild>
            <Link href="/sign-up">{copy.cta}</Link>
          </Button>

          <p className="mt-5 text-sm text-muted-foreground">{copy.note}</p>
        </Reveal>
      </div>
    </section>
  )
}
