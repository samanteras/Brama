import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { deleteBot } from '../../../actions'
import { BotSettingsForm } from '../bot-settings-form'
import { InstallGuide } from '../install-guide'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { appUrl } from '@/lib/env'
import { getPlan, toPlanId } from '@/lib/plans'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Bot settings',
}

export default async function BotSettingsPage(
  props: PageProps<'/dashboard/bots/[botId]/settings'>,
) {
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

  if (!bot) notFound()

  const plan = getPlan(toPlanId(profile?.plan))
  const snippet = `<script src="${appUrl()}/widget.js" data-foreman-bot="${bot.id}" async></script>`

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
      <Card className="min-w-0 p-6">
        <h2 className="mb-6 font-semibold">Settings</h2>
        <BotSettingsForm bot={bot} canLockDomains={plan.features.customDomains} />
      </Card>

      <div className="min-w-0 space-y-8">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Add it to your site</h2>
          <InstallGuide snippet={snippet} />
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
  )
}
