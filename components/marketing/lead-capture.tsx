import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * The lead card as it appears in the dashboard.
 *
 * This is the argument the whole product rests on, so the section shows the
 * artefact rather than describing it: not a row with a phone number, but
 * everything a manager needs to open the call already knowing the job.
 */
export function LeadCapture() {
  return (
    <section id="leads" className="border-b bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20">
        <div>
          <Badge variant="secondary" className="mb-4">
            What most chatbots get backwards
          </Badge>

          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            The question it can&apos;t answer is worth the most
          </h2>

          <div className="mt-6 space-y-4 text-lg text-muted-foreground text-pretty">
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

          <p className="mt-8 border-l-2 border-primary pl-4 text-lg font-medium text-foreground text-pretty">
            One captured job pays for a year of Brama.
          </p>
        </div>

        <Card className="gap-0 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b px-5 py-3">
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
              Four questions asked. Full conversation attached, so nobody has to open the call with
              &ldquo;so, tell me what you need&rdquo;.
            </p>
          </div>
        </Card>
      </div>
    </section>
  )
}
