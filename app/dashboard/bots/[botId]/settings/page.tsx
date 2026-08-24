import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { deleteBot } from '../../../actions'
import { BotSettingsForm } from '../bot-settings-form'
import { InstallGuide } from '../install-guide'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { appUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'
import { buildEmbedSnippet } from '@/lib/widget-contract'

export const metadata: Metadata = {
  title: 'Настройки бота',
}

export default async function BotSettingsPage(
  props: PageProps<'/dashboard/bots/[botId]/settings'>,
) {
  const { botId } = await props.params
  const supabase = await createClient()

  const { data: bot } = await supabase
    .from('bots')
    .select('id, name, greeting, accent_color, allowed_domains')
    .eq('id', botId)
    .maybeSingle()

  if (!bot) notFound()

  const snippet = buildEmbedSnippet(appUrl(), bot.id)

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
      <Card className="min-w-0 p-6">
        <h2 className="mb-6 font-semibold">Настройки</h2>
        <BotSettingsForm bot={bot} />
      </Card>

      <div className="min-w-0 space-y-8">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Поставьте на свой сайт</h2>
          <InstallGuide snippet={snippet} />
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold">Удалить бота</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground text-pretty">
            Удалит его документы, диалоги и заявки. Отменить будет нельзя.
          </p>

          <form action={deleteBot}>
            <input type="hidden" name="botId" value={bot.id} />
            <Button type="submit" variant="outline" size="sm">
              Удалить бота
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
