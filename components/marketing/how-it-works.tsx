import type { MarketingCopy } from '@/components/marketing/copy'
import { Reveal, Stagger, StaggerItem } from '@/components/marketing/motion'

export function HowItWorks({ copy }: { copy: MarketingCopy['howItWorks'] }) {
  return (
    <section id="how-it-works" className="border-b bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <Reveal className="max-w-3xl">
          <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {copy.title}
          </h2>
          <p className="mt-6 text-lg text-muted-foreground text-pretty sm:text-xl">{copy.sub}</p>
        </Reveal>

        <Stagger className="mt-16 grid gap-12 sm:grid-cols-3" delay={0.15}>
          {copy.steps.map((step, index) => (
            <StaggerItem key={step.title}>
              <span className="flex size-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-base font-semibold text-primary">
                {index + 1}
              </span>

              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>

              <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">{step.body}</p>

              <p className="mt-4 border-l-2 border-primary/40 pl-4 text-sm leading-relaxed text-muted-foreground/80 text-pretty">
                {step.detail}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
