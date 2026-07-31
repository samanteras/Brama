import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LeadCard } from './lead-card'
import { Card } from '@/components/ui/card'
import { getPlan, toPlanId } from '@/lib/plans'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Leads',
}

export default async function LeadsPage(props: PageProps<'/dashboard/bots/[botId]/leads'>) {
  const { botId } = await props.params
  const supabase = await createClient()

  const [{ data: bot }, { data: leads }, { data: profile }] = await Promise.all([
    supabase.from('bots').select('id').eq('id', botId).maybeSingle(),
    supabase
      .from('leads')
      .select('id, name, phone, email, context, created_at, conversation_id')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('plan').maybeSingle(),
  ])

  if (!bot) notFound()

  const plan = getPlan(toPlanId(profile?.plan))
  const all = leads ?? []
  const visibleCount = plan.limits.visibleLeads ?? all.length
  const visible = all.slice(0, visibleCount)
  const hidden = all.length - visible.length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold">Leads</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            People who left their details rather than leaving your site.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{all.length} in total</p>
      </div>

      {all.length === 0 ? (
        <Card className="items-center p-12 text-center">
          <h3 className="text-lg font-semibold">No leads yet</h3>
          <p className="mt-2 max-w-md text-muted-foreground text-pretty">
            When the bot cannot answer something, or a visitor asks to speak to someone, it takes
            their number and it appears here — with what they wanted already written down.
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {visible.map((lead) => (
            <li key={lead.id}>
              <LeadCard lead={lead} botId={botId} />
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 ? (
        <Card className="border-primary/40 p-6 text-center">
          <p className="font-medium">
            {hidden} more {hidden === 1 ? 'lead is' : 'leads are'} waiting
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground text-pretty">
            The {plan.name} plan shows your {visibleCount} most recent. The rest are collected and
            kept — upgrade to see them.
          </p>
        </Card>
      ) : null}
    </div>
  )
}
