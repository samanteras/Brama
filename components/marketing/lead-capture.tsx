import type { MarketingCopy } from '@/components/marketing/copy'
import { Reveal } from '@/components/marketing/motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * The lead card as it appears in the dashboard.
 *
 * This is the argument the whole product rests on, so the section shows the
 * artefact rather than describing it: not a row with a phone number, but
 * everything a manager needs to open the call already knowing the job. Dark
 * scene on purpose — this is the second act of the show the hero opened.
 */
export function LeadCapture({ copy }: { copy: MarketingCopy['leadCapture'] }) {
  return (
    <section
      id="leads"
      className="dark relative overflow-hidden border-b border-white/10 bg-background text-foreground"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-140px] right-[-160px] h-[460px] w-[640px] rounded-full bg-primary/15 blur-[150px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-16 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-32">
        <Reveal>
          <Badge variant="secondary" className="mb-5">
            {copy.badge}
          </Badge>

          <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {copy.title}
          </h2>

          <div className="mt-8 space-y-4 text-lg text-muted-foreground text-pretty sm:text-xl">
            <p>{copy.paragraphs[0]}</p>
            <p>{copy.paragraphs[1]}</p>
          </div>

          <p className="mt-10 border-l-2 border-primary pl-5 text-xl font-medium text-foreground text-pretty">
            {copy.pullQuote}
          </p>
        </Reveal>

        <Reveal delay={0.15} className="relative">
          <div aria-hidden className="absolute -inset-6 rounded-3xl bg-primary/10 blur-3xl" />

          <Card className="relative gap-0 overflow-hidden border-white/10 p-0 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <p className="text-sm font-medium">{copy.card.header}</p>
              <p className="text-xs text-muted-foreground">{copy.card.timestamp}</p>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <p className="text-lg font-semibold">{copy.card.name}</p>
                <p className="text-sm text-muted-foreground">{copy.card.phone}</p>
              </div>

              <dl className="space-y-3 text-sm">
                {copy.card.rows.map((row, index) => (
                  <div key={row.label} className="flex gap-3">
                    <dt className="w-24 shrink-0 text-muted-foreground">{row.label}</dt>
                    <dd className={index === copy.card.rows.length - 1 ? 'font-medium' : undefined}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground text-pretty">
                {copy.card.footnote}
              </p>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  )
}
