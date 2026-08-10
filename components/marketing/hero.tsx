import Link from 'next/link'

import { ChatPreview, type PreviewMessage } from '@/components/marketing/chat-preview'
import { Reveal } from '@/components/marketing/motion'
import { Button } from '@/components/ui/button'
import { PLANS } from '@/lib/plans'

const CONVERSATION: PreviewMessage[] = [
  {
    role: 'visitor',
    text: 'Hi — roughly what does a full renovation of a 54 m² flat cost, and does that include demolition?',
  },
  {
    role: 'bot',
    text: 'For 54 m² turnkey we start at €520/m², so around €28,000. Demolition and waste removal are included; furniture and appliances are not. Materials are billed separately at cost.',
  },
  {
    role: 'visitor',
    text: 'And could you start before September?',
  },
  {
    role: 'bot',
    text: "That depends on the current schedule, which I can't see. Leave your number and the site manager will confirm dates tomorrow morning.",
    showLeadForm: true,
  },
]

/**
 * The opening scene. Dark on purpose: the page opens as a stage for the
 * product, and the one thing that moves is the widget answering a customer.
 */
export function Hero() {
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
              For businesses whose answers already live in their documents
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Your best enquiries arrive after hours.{' '}
              <span className="text-primary">Brama is still awake.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mt-8 max-w-xl text-lg text-muted-foreground text-pretty sm:text-xl">
              Upload the price list and terms you already have. Brama answers customers in your own
              words, around the clock — and when it doesn&apos;t know, it takes their number instead
              of guessing.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-7 text-base" asChild>
                <Link href="/sign-up">Build your bot free</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-7 text-base" asChild>
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <p className="mt-5 text-sm text-muted-foreground">
              No card required. {PLANS.free.limits.answersPerMonth} answers a month on the free
              plan.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.35} className="relative">
          <div
            aria-hidden
            className="absolute -inset-6 rounded-3xl bg-primary/15 blur-3xl"
          />
          <ChatPreview
            messages={CONVERSATION}
            host="renovation-company.com"
            className="relative"
          />
          <p className="mt-5 text-center text-sm text-muted-foreground">
            A real limitation, handled well: no invented date, a captured phone number.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
