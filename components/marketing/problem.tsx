import { Clock, MessageSquareDashed, PhoneOff } from 'lucide-react'

import { Reveal, Stagger, StaggerItem } from '@/components/marketing/motion'

const LEAKS = [
  {
    icon: Clock,
    title: 'The evening enquiry',
    body: 'People weigh up a big purchase after work, on the sofa, at half past ten. Your office is closed, the form promises a reply “within a working day”, and the next tab is already a competitor.',
  },
  {
    icon: MessageSquareDashed,
    title: 'The same five questions',
    body: 'What is included. How long it takes. Who buys materials. Whether there is a warranty. How payment is staged. Answered by hand, again, every week.',
  },
  {
    icon: PhoneOff,
    title: 'The enquiry with no number',
    body: 'Someone read three pages, decided you were too expensive because nothing said otherwise, and left. You never knew they were there.',
  },
]

export function Problem() {
  return (
    <section className="border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <Reveal className="max-w-3xl">
          <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Where enquiries quietly leak away
          </h2>
          <p className="mt-6 text-lg text-muted-foreground text-pretty sm:text-xl">
            Not from bad work or bad prices. From nobody being there at the moment somebody was
            ready to ask.
          </p>
        </Reveal>

        <Stagger className="mt-16 grid gap-10 sm:grid-cols-3" delay={0.15}>
          {LEAKS.map((leak) => (
            <StaggerItem key={leak.title}>
              <span className="inline-flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <leak.icon className="size-6 text-primary" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{leak.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
                {leak.body}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
