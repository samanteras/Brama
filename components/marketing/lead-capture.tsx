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
export function LeadCapture() {
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
            What most chatbots get backwards
          </Badge>

          <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            The question it can&apos;t answer is worth the most
          </h2>

          <div className="mt-8 space-y-4 text-lg text-muted-foreground text-pretty sm:text-xl">
            <p>
              Ask most document chatbots something outside their documents and they invent an
              answer. On your own website that is a price nobody agreed to.
            </p>
            <p>
              Brama does the opposite. When the answer isn&apos;t in your files, it says so, says a
              person should confirm, and asks for a number. The gap in your documents becomes a
              callback instead of an apology.
            </p>
          </div>

          <p className="mt-10 border-l-2 border-primary pl-5 text-xl font-medium text-foreground text-pretty">
            One captured job pays for a year of Brama.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="relative">
          <div aria-hidden className="absolute -inset-6 rounded-3xl bg-primary/10 blur-3xl" />

          <Card className="relative gap-0 overflow-hidden border-white/10 p-0 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <p className="text-sm font-medium">New lead</p>
              <p className="text-xs text-muted-foreground">23:41, from the website</p>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <p className="text-lg font-semibold">Anna Kowalska</p>
                <p className="text-sm text-muted-foreground">+48 601 234 567</p>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted-foreground">Wants</dt>
                  <dd>Turnkey renovation, 54 m² two-room flat</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted-foreground">Budget</dt>
                  <dd>Around €28,000, asked twice about what is included</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted-foreground">Timing</dt>
                  <dd>Hoping to start before September</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted-foreground">Stalled on</dt>
                  <dd className="font-medium">
                    &ldquo;Could you start before September?&rdquo; — not in your documents
                  </dd>
                </div>
              </dl>

              <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground text-pretty">
                Four questions asked. Full conversation attached, so nobody has to open the call
                with &ldquo;so, tell me what you need&rdquo;.
              </p>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  )
}
