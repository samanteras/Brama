import Link from 'next/link'

import { ChatPreview } from '@/components/marketing/chat-preview'
import type { MarketingCopy } from '@/components/marketing/copy'
import { Reveal } from '@/components/marketing/motion'
import { Button } from '@/components/ui/button'

/**
 * The opening scene. Dark on purpose: the page opens as a stage for the
 * product, and the one thing that moves is the widget answering a customer.
 */
export function Hero({ copy }: { copy: MarketingCopy['hero'] }) {
  return (
    <section className="dark relative overflow-hidden border-b border-white/10 bg-background text-foreground">
      {/* Stage lighting: one warm key light behind the headline, one behind
          the widget. Decorative only, so hidden from assistive tech. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-64 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[160px]" />
        <div className="absolute right-[-180px] bottom-[-120px] h-[420px] w-[560px] rounded-full bg-primary/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-16 px-4 py-24 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:py-36">
        <div>
          <Reveal>
            <p className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              {copy.badge}
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {copy.titleLead} <span className="text-primary">{copy.titleAccent}</span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mt-8 max-w-xl text-lg text-muted-foreground text-pretty sm:text-xl">
              {copy.sub}
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-7 text-base" asChild>
                <Link href="/sign-up">{copy.ctaPrimary}</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-7 text-base" asChild>
                <Link href="#how-it-works">{copy.ctaSecondary}</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <p className="mt-5 text-sm text-muted-foreground">{copy.note}</p>
          </Reveal>
        </div>

        <Reveal delay={0.35} className="relative">
          <div aria-hidden className="absolute -inset-6 rounded-3xl bg-primary/15 blur-3xl" />
          <ChatPreview messages={copy.conversation} host={copy.chatHost} className="relative" />
          <p className="mt-5 text-center text-sm text-muted-foreground">{copy.chatCaption}</p>
        </Reveal>
      </div>
    </section>
  )
}
