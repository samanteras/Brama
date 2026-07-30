import Link from 'next/link'

import { ChatPreview, type PreviewMessage } from '@/components/marketing/chat-preview'
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

export function Hero() {
  return (
    <section className="border-b">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:py-24">
        <div>
          <p className="text-sm font-medium text-primary">For renovation and fit-out companies</p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Your best enquiries arrive after hours. Foreman is still awake.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
            Upload the price list and terms you already have. Foreman answers customers in your own
            words, around the clock — and when it doesn&apos;t know, it takes their number instead of
            guessing.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/sign-up">Build your bot free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            No card required. {PLANS.free.limits.answersPerMonth} answers a month on the free plan.
          </p>
        </div>

        <div className="relative">
          <ChatPreview messages={CONVERSATION} host="renovation-company.com" />

          <p className="mt-4 text-center text-sm text-muted-foreground">
            A real limitation, handled well: no invented date, a captured phone number.
          </p>
        </div>
      </div>
    </section>
  )
}
