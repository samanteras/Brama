import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { deleteBot } from '../../actions'
import { BotSettingsForm } from './bot-settings-form'
import { EmbedSnippet } from './embed-snippet'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { appUrl } from '@/lib/env'
import { getPlan, toPlanId } from '@/lib/plans'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Bot settings',
}

export default async function BotPage(props: PageProps<'/dashboard/bots/[botId]'>) {
  const { botId } = await props.params
  const supabase = await createClient()

  const [{ data: bot }, { data: profile }] = await Promise.all([
    supabase
      .from('bots')
      .select('id, name, greeting, accent_color, allowed_domains')
      .eq('id', botId)
      .maybeSingle(),
    supabase.from('profiles').select('plan').maybeSingle(),
  ])

  // Row level security means another tenant's bot reads as absent, so a missing
  // row and a forbidden one are indistinguishable here — which is exactly what
  // we want to tell the caller.
  if (!bot) notFound()

  const plan = getPlan(toPlanId(profile?.plan))

  const snippet = `<script src="${appUrl()}/widget.js" data-foreman-bot="${bot.id}" async></script>`

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          All bots
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{bot.name}</h1>
      </div>

      {/*
        Two columns only from xl. At lg the settings form was squeezed into a
        column too narrow for its own labels — a form with room to breathe on
        one column beats a cramped two-column layout. `minmax(0,…)` stops the
        code block in the sidebar from forcing the grid wider than the page.
      */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
        <Card className="min-w-0 p-6">
          <h2 className="mb-6 font-semibold">Settings</h2>
          <BotSettingsForm bot={bot} canLockDomains={plan.features.customDomains} />
        </Card>

        <div className="min-w-0 space-y-8">
          <Card className="p-6">
            <h2 className="font-semibold">Add it to your site</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground text-pretty">
              Paste this before the closing <code className="text-xs">&lt;/body&gt;</code> tag. The
              chat window only loads when a visitor clicks the button, so your page speed is
              unaffected.
            </p>
            <EmbedSnippet snippet={snippet} />
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold">Delete this bot</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground text-pretty">
              Removes its documents, conversations and leads. This cannot be undone.
            </p>

            <form action={deleteBot}>
              <input type="hidden" name="botId" value={bot.id} />
              <Button type="submit" variant="outline" size="sm">
                Delete bot
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
