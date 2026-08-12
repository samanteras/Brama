import { Clock, MessageSquareDashed, PhoneOff } from 'lucide-react'

import type { MarketingCopy } from '@/components/marketing/copy'
import { Reveal, Stagger, StaggerItem } from '@/components/marketing/motion'

/** Icons stay here — they are layout, not language. Order matches the copy. */
const ICONS = [Clock, MessageSquareDashed, PhoneOff]

export function Problem({ copy }: { copy: MarketingCopy['problem'] }) {
  return (
    <section className="border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <Reveal className="max-w-3xl">
          <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {copy.title}
          </h2>
          <p className="mt-6 text-lg text-muted-foreground text-pretty sm:text-xl">{copy.sub}</p>
        </Reveal>

        <Stagger className="mt-16 grid gap-10 sm:grid-cols-3" delay={0.15}>
          {copy.leaks.map((leak, index) => {
            const Icon = ICONS[index] ?? Clock

            return (
              <StaggerItem key={leak.title}>
                <span className="inline-flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                  <Icon className="size-6 text-primary" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{leak.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
                  {leak.body}
                </p>
              </StaggerItem>
            )
          })}
        </Stagger>
      </div>
    </section>
  )
}
