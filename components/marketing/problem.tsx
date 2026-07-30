import { Clock, MessageSquareDashed, PhoneOff } from 'lucide-react'

const LEAKS = [
  {
    icon: Clock,
    title: 'The evening enquiry',
    body: 'People plan renovations after work, on the sofa, at half past ten. Your office is closed, the form promises a reply “within a working day”, and the next tab is already a competitor.',
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
    <section className="border-b bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Where renovation enquiries quietly leak away
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Not from bad work or bad prices. From nobody being there at the moment somebody was
            ready to ask.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {LEAKS.map((leak) => (
            <div key={leak.title}>
              <leak.icon className="size-6 text-primary" aria-hidden />
              <h3 className="mt-4 font-semibold">{leak.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                {leak.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
